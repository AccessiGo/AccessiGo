# AccessiGo

AccessiGo is a web app that highlights **accessible building entrances** on the **University of Windsor** campus map to help students, staff, and visitors with mobility challenges quickly find **barrier-free** entry points.

- **Current focus:** outdoor accessibility (wheelchair-accessible entrances shown clearly on an interactive map).
- **Planned:** indoor navigation (elevators, ramps, washrooms), richer accessibility metadata, and routing.

---

## Features
- Interactive campus map with accessible entrances
- Image upload & ML scoring (0–1 “accessibility” score)
- Visual feedback on uploaded photos  
  - **0.0–0.4 ⇒ green (accessible)**  
  - **0.4–0.6 ⇒ yellow (somewhat accessible)**  
  - **0.6–1.0 ⇒ red (not accessible)**
- Simple, no-framework frontend (HTML/CSS/JS)
- Flask backend that loads a TensorFlow **.keras** model or a pickled **.pkl** model

---

## Tech Stack
**Frontend:** HTML, CSS, Vanilla JavaScript  
**Backend:** Python (Flask), TensorFlow (via pickle)  
