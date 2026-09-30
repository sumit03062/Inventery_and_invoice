import uuid
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from rest_framework.exceptions import ValidationError
from shop.models import Customer, Reminder, Staff
from shop.serializers import CustomerSerializer
from shop.integrations import enqueue_reminder, deliver_reminder, ready


class Command(BaseCommand):
    help = 'Preview overdue reminders, or queue and deliver them with --send and explicit server opt-in.'

    def add_arguments(self, parser):
        parser.add_argument('--send', action='store_true')

    def handle(self, *args, **options):
        sending = options['send']
        if sending and (not settings.AUTOMATIC_REMINDERS or not ready('whatsapp')):
            raise CommandError('Enable AUTOMATIC_REMINDERS and configure WhatsApp before using --send.')
        owner = Staff.objects.filter(role='OWNER', user__is_active=True).select_related('user').first()
        if not owner:
            raise CommandError('An active owner is required.')
        count = 0
        for customer in Customer.objects.filter(active=True, whatsapp_consent=True):
            if not CustomerSerializer().get_overdue(customer):
                continue
            count += 1
            if sending:
                try:
                    enqueue_reminder(owner.user, customer, uuid.uuid4())
                except ValidationError:
                    continue  # Rate-limited, settled, or opted out since query.
        if sending:
            for pk in Reminder.objects.filter(status='QUEUED').values_list('pk', flat=True):
                deliver_reminder(pk)
        self.stdout.write(f'{count} overdue customers eligible; mode: {"send" if sending else "preview"}.')
