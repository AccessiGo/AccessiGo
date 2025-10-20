# api/index.py
from vercel_wsgi import handle
from app import app as application  # import your Flask app object from app.py

def handler(event, context):
    # Vercel invokes this; vercel-wsgi adapts AWS-style events to WSGI
    return handle(application, event, context)
