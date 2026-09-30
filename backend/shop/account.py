from django.conf import settings
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .views import LoginThrottle
from . import services as s


@api_view(['GET','POST'])
def profile(request):
    if request.method=='POST':
        from django.core.validators import validate_email
        if not request.user.check_password(request.data.get('current_password','')):
            raise ValidationError('Current password is incorrect.')
        email=str(request.data.get('email','')).strip()
        validate_email(email)
        request.user.email=email
        request.user.save(update_fields=['email'])
        s.audit(request.user,'RECOVERY_EMAIL_UPDATED','Recovery email changed by account holder')
    return Response({'email':request.user.email,'email_recovery_enabled':settings.PASSWORD_RESET_ENABLED})


@api_view(['POST'])
def change_password(request):
    if not request.user.check_password(request.data.get('current_password','')):
        raise ValidationError('Current password is incorrect.')
    password=request.data.get('new_password','')
    validate_password(password,request.user)
    request.user.set_password(password)
    request.user.save(update_fields=['password'])
    update_session_auth_hash(request,request.user)
    s.audit(request.user,'PASSWORD_CHANGED','Password changed by account holder')
    return Response({'ok':True})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def forgot_password(request):
    from rest_framework.authentication import SessionAuthentication
    SessionAuthentication().enforce_csrf(request)
    email=str(request.data.get('email','')).strip()
    username=str(request.data.get('username','')).strip()
    user=get_user_model().objects.filter(username=username,email__iexact=email,is_active=True).first() if email and username else None
    if user and settings.PASSWORD_RESET_ENABLED:
        uid=urlsafe_base64_encode(force_bytes(user.pk))
        token=default_token_generator.make_token(user)
        url=f'{settings.PUBLIC_APP_URL}/reset-password?uid={uid}&token={token}'
        send_mail('Reset your Shopbook password',f'Use this link to reset your password:\n{url}\nIf you did not request this, ignore the email.',
            settings.DEFAULT_FROM_EMAIL,[user.email],fail_silently=True)
    return Response({'message':'If the account matches and email recovery is configured, a reset link will be sent. Otherwise contact the shop owner.'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
@transaction.atomic
def reset_password(request):
    from rest_framework.authentication import SessionAuthentication
    SessionAuthentication().enforce_csrf(request)
    try:
        pk=urlsafe_base64_decode(str(request.data.get('uid',''))).decode()
        user=get_user_model().objects.select_for_update().get(pk=pk,is_active=True)
    except (ValueError,UnicodeDecodeError,OverflowError,get_user_model().DoesNotExist):
        raise ValidationError('Invalid or expired reset link.')
    if not default_token_generator.check_token(user,str(request.data.get('token',''))):
        raise ValidationError('Invalid or expired reset link.')
    password=request.data.get('new_password','')
    validate_password(password,user)
    user.set_password(password)
    user.save(update_fields=['password'])
    s.audit(user,'PASSWORD_RESET','Email recovery completed')
    return Response({'ok':True})
