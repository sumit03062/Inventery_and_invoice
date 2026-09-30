import os
import time
from pathlib import Path
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone

class Command(BaseCommand):
    help = 'Run daily encrypted backups and opted-in reminders. Use one maintenance worker per shop.'
    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true')
    def handle(self,*args,**options):
        while True:
            try:
                directory=os.getenv('BACKUP_DIRECTORY','')
                if directory:
                    target=Path(directory)/f'shop-{timezone.localdate()}.zip.enc'
                    if not target.exists():
                        call_command('backup_shop',output=str(target),encrypt=True)
                if settings.AUTOMATIC_REMINDERS:
                    call_command('send_reminders',send=True)
            except Exception:
                self.stderr.write('Maintenance failed. Check configuration and provider status; retry on the next cycle.')
                if options['once']:
                    raise CommandError('Maintenance did not complete.')
            if options['once']:
                return
            time.sleep(300)
