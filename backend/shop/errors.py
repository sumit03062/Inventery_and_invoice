from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, OperationalError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_handler


def exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        return Response({'detail': exc.messages}, status=400)
    if isinstance(exc, IntegrityError):
        return Response({'detail': 'A record with these unique details already exists, or the operation violates a data constraint.'}, status=400)
    if isinstance(exc, OperationalError) and 'locked' in str(exc).lower():
        return Response({'detail': 'Another transaction is finishing. Retry with the same request.'}, status=409)
    return drf_handler(exc, context)
