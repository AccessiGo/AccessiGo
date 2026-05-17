import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

type ResultTone = 'green' | 'yellow' | 'red';

type ClassifierResult = {
  score: number;
  tone: ResultTone;
  title: string;
  description: string;
};

type SelectedPhoto = {
  uri: string;
  fileName: string;
  mimeType: string;
};

const defaultApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:5000';

function resultFromScore(score: number): ClassifierResult {
  if (score <= 0.4) {
    return {
      score,
      tone: 'green',
      title: 'Looks accessible',
      description: 'The entrance appears to have a clear, barrier-free approach.'
    };
  }

  if (score < 0.6) {
    return {
      score,
      tone: 'yellow',
      title: 'Review with caution',
      description: 'Check slope, curb cuts, nearby ramps, and door clearance before relying on this route.'
    };
  }

  return {
    score,
    tone: 'red',
    title: 'Likely inaccessible',
    description: 'The photo may show barriers that make wheelchair access difficult.'
  };
}

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function getAssetName(uri: string, fallback: string) {
  const name = uri.split('/').pop();
  return name && name.includes('.') ? name : fallback;
}

export default function App() {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [result, setResult] = useState<ClassifierResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const helperText = useMemo(() => {
    if (Platform.OS === 'android') {
      return 'Android emulator tip: use http://10.0.2.2:5000 for the Flask server.';
    }

    return 'Simulator tip: localhost works on iOS. On a physical phone, use your computer LAN IP.';
  }, []);

  const selectPhoto = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access so AccessiGo can classify entrance images.');
      return;
    }

    const response =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85
          });

    if (response.canceled || !response.assets[0]) return;

    const asset = response.assets[0];
    setPhoto({
      uri: asset.uri,
      fileName: asset.fileName || getAssetName(asset.uri, 'entrance-photo.jpg'),
      mimeType: asset.mimeType || 'image/jpeg'
    });
    setResult(null);
  };

  const submitPhoto = async () => {
    if (!photo) return;

    const endpoint = `${normalizeApiUrl(apiUrl)}/upload`;
    const formData = new FormData();
    formData.append('file', {
      uri: photo.uri,
      name: photo.fileName,
      type: photo.mimeType
    } as unknown as Blob);

    setIsUploading(true);
    setResult(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json'
        }
      });

      const payload = await response.json();

      if (!response.ok || payload.error) {
        throw new Error(payload.error || 'Classifier request failed.');
      }

      const score = typeof payload.score === 'number' ? payload.score : Number(payload.score);
      if (!Number.isFinite(score)) {
        throw new Error('Classifier returned an invalid score.');
      }

      setResult(resultFromScore(score));
    } catch (error) {
      Alert.alert(
        'Could not classify photo',
        error instanceof Error ? error.message : 'Check the API URL and make sure Flask is running.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image source={require('./assets/logo.png')} style={styles.logo} />
            <Text style={styles.brand}>AccessiGo</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>Check accessible entrances before you go.</Text>
            <Text style={styles.subtitle}>
              Take or upload an entrance photo and send it to the AccessiGo accessibility classifier.
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Classifier API</Text>
            <TextInput
              value={apiUrl}
              onChangeText={setApiUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://127.0.0.1:5000"
              placeholderTextColor="#98a2b3"
              style={styles.input}
            />
            <Text style={styles.helper}>{helperText}</Text>
          </View>

          <View style={styles.photoPanel}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.preview} />
            ) : (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyIcon}>A</Text>
                <Text style={styles.emptyTitle}>No entrance photo selected</Text>
                <Text style={styles.emptyText}>Use the camera or choose a photo from your library.</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.primaryButton} onPress={() => selectPhoto('camera')}>
                <Text style={styles.primaryButtonText}>Take Photo</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => selectPhoto('library')}>
                <Text style={styles.secondaryButtonText}>Upload Photo</Text>
              </Pressable>
            </View>

            <Pressable
              disabled={!photo || isUploading}
              style={[styles.analyzeButton, (!photo || isUploading) && styles.disabledButton]}
              onPress={submitPhoto}>
              {isUploading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.analyzeButtonText}>Analyze Accessibility</Text>
              )}
            </Pressable>

            {photo && (
              <Pressable style={styles.clearButton} onPress={reset}>
                <Text style={styles.clearButtonText}>Clear photo</Text>
              </Pressable>
            )}
          </View>

          {result && (
            <View style={[styles.resultCard, styles[`resultCard_${result.tone}`]]}>
              <View style={[styles.resultBadge, styles[`resultBadge_${result.tone}`]]}>
                <Text style={styles.resultBadgeText}>{result.tone === 'green' ? 'OK' : result.tone === 'yellow' ? '!' : 'X'}</Text>
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle}>{result.title}</Text>
                <Text style={styles.resultScore}>Score: {result.score.toFixed(2)}</Text>
                <Text style={styles.resultDescription}>{result.description}</Text>
              </View>
            </View>
          )}

          <View style={styles.notes}>
            <Text style={styles.notesTitle}>How to use the signal</Text>
            <Text style={styles.note}>Green: likely accessible and ready to map.</Text>
            <Text style={styles.note}>Yellow: verify ramps, slope, clearance, and route context.</Text>
            <Text style={styles.note}>Red: likely includes barriers that should be documented.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fbfbff'
  },
  keyboardView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 42,
    gap: 18
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12
  },
  brand: {
    color: '#ff0878',
    fontSize: 24,
    fontWeight: '900'
  },
  hero: {
    paddingTop: 20,
    paddingBottom: 4
  },
  title: {
    color: '#050505',
    fontSize: 39,
    lineHeight: 43,
    fontWeight: '900',
    letterSpacing: 0
  },
  subtitle: {
    marginTop: 14,
    color: '#667085',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600'
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7f0',
    padding: 16,
    shadowColor: '#2b2350',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3
  },
  panelTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d5ff',
    paddingHorizontal: 13,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: '#ffffff'
  },
  helper: {
    marginTop: 9,
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  },
  photoPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e5e7f0',
    padding: 16,
    gap: 14,
    shadowColor: '#2b2350',
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 18 },
    elevation: 4
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#f3f1ff'
  },
  emptyPreview: {
    minHeight: 300,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7f0',
    backgroundColor: '#f7f8fc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#ff0878',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 58,
    fontSize: 28,
    fontWeight: '900',
    overflow: 'hidden',
    marginBottom: 16
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center'
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    gap: 10
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: '#ff0878',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff0878',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900'
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d5ff',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonText: {
    color: '#6255f6',
    fontSize: 15,
    fontWeight: '900'
  },
  analyzeButton: {
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: '#2d2537',
    alignItems: 'center',
    justifyContent: 'center'
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  },
  disabledButton: {
    opacity: 0.45
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 4
  },
  clearButtonText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '800'
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16
  },
  resultCard_green: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6'
  },
  resultCard_yellow: {
    backgroundColor: '#fffaeb',
    borderColor: '#fedf89'
  },
  resultCard_red: {
    backgroundColor: '#fef3f2',
    borderColor: '#fecdca'
  },
  resultBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultBadge_green: {
    backgroundColor: '#22c55e'
  },
  resultBadge_yellow: {
    backgroundColor: '#eab308'
  },
  resultBadge_red: {
    backgroundColor: '#ef4444'
  },
  resultBadgeText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14
  },
  resultContent: {
    flex: 1
  },
  resultTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900'
  },
  resultScore: {
    marginTop: 3,
    color: '#344054',
    fontSize: 14,
    fontWeight: '800'
  },
  resultDescription: {
    marginTop: 6,
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  notes: {
    backgroundColor: '#f3f1ff',
    borderRadius: 18,
    padding: 16,
    gap: 7
  },
  notesTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3
  },
  note: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  }
});
