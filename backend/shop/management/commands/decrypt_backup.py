import os
from pathlib import Path
from cryptography.fernet import Fernet, InvalidToken
from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = 'Decrypt a backup into a new ZIP file; never modifies the live database.'
    def add_arguments(self, parser):
        parser.add_argument('--input', required=True)
        parser.add_argument('--output', required=True)
    def handle(self, *args, **options):
        try:
            content=Fernet(os.environ['BACKUP_ENCRYPTION_KEY'].encode()).decrypt(Path(options['input']).read_bytes())
        except (KeyError, ValueError, InvalidToken, OSError):
            raise CommandError('Unable to decrypt: check the backup file and encryption key.')
        output=Path(options['output'])
        if output.exists():
            raise CommandError('Choose a new output filename.')
        output.parent.mkdir(parents=True,exist_ok=True)
        with output.open('xb') as stream:
            stream.write(content)
        self.stdout.write('Backup decrypted. Follow the documented offline restore procedure.')
