import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError('SECRET_KEY must be configured when DEBUG=false')
    from django.core.management.utils import get_random_secret_key
    secret_file = BASE_DIR / '.local-secret'
    if not secret_file.exists():
        secret_file.write_text(get_random_secret_key())
    SECRET_KEY = secret_file.read_text()
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',')
INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes',
                  'django.contrib.sessions', 'rest_framework', 'shop']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware',
              'django.contrib.sessions.middleware.SessionMiddleware',
              'django.middleware.common.CommonMiddleware',
              'django.middleware.csrf.CsrfViewMiddleware',
              'django.contrib.auth.middleware.AuthenticationMiddleware',
              'django.middleware.clickjacking.XFrameOptionsMiddleware']
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3',
                        'NAME': os.getenv('DATABASE_PATH', str(BASE_DIR / 'db.sqlite3')),
                        'TEST': {'NAME': os.getenv('TEST_DATABASE_PATH')},
                        'OPTIONS': {'timeout': 30, 'transaction_mode': 'IMMEDIATE'}}}
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
LANGUAGE_CODE = 'en-in'
TIME_ZONE = 'Asia/Kolkata'
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = os.getenv('COOKIE_SECURE', str(not DEBUG)).lower() == 'true'
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001').split(',')
SESSION_COOKIE_AGE = 60 * 60 * 12
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'SAMEORIGIN'
MEDIA_ROOT = Path(os.getenv('MEDIA_ROOT', str(BASE_DIR / 'media')))
MEDIA_URL = '/api/media/'
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.ScopedRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {'login': '20/minute'},
    'EXCEPTION_HANDLER': 'shop.errors.exception_handler',
}

# Keep credentials server-side; enabling a provider is an explicit deployment step.
for _name in ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET',
              'WHATSAPP_TOKEN','WHATSAPP_PHONE_ID','WHATSAPP_APP_SECRET','WHATSAPP_VERIFY_TOKEN',
              'WHATSAPP_TEMPLATE','WHATSAPP_GRAPH_VERSION']:
    globals()[_name] = os.getenv(_name, '')
RAZORPAY_ENABLED = os.getenv('RAZORPAY_ENABLED', 'false').lower() == 'true'
WHATSAPP_ENABLED = os.getenv('WHATSAPP_ENABLED', 'false').lower() == 'true'
WHATSAPP_LANGUAGE = os.getenv('WHATSAPP_LANGUAGE', 'en')
REMINDER_INTERVAL_HOURS = max(24, int(os.getenv('REMINDER_INTERVAL_HOURS', '72')))
AUTOMATIC_REMINDERS = os.getenv('AUTOMATIC_REMINDERS', 'false').lower() == 'true'
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.db.DatabaseCache', 'LOCATION': 'shop_cache'}}
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https') if os.getenv('TRUST_PROXY_HEADERS', 'false').lower() == 'true' else None
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'false').lower() == 'true'
SECURE_REDIRECT_EXEMPT = [r'^api/health/$']
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '0'))
LOGGING = {'version':1, 'disable_existing_loggers':False,
    'handlers':{'console':{'class':'logging.StreamHandler'}},
    'loggers':{'django.request':{'handlers':['console'],'level':'ERROR','propagate':False}}}

PASSWORD_RESET_ENABLED = os.getenv('PASSWORD_RESET_ENABLED', 'false').lower() == 'true'
PUBLIC_APP_URL = os.getenv('PUBLIC_APP_URL', 'http://127.0.0.1:3001').rstrip('/')
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'shop@example.com')
EMAIL_TIMEOUT = 10
PASSWORD_RESET_TIMEOUT = 3600
