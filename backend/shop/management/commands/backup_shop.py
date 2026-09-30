import sqlite3
import tempfile
import zipfile
import os
from contextlib import closing
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create an online SQLite backup and archive uploaded shop media.'

    def add_arguments(self, parser):
        parser.add_argument('--output', required=True)
        parser.add_argument('--encrypt', action='store_true', help='Encrypt using BACKUP_ENCRYPTION_KEY (Fernet).')

    def handle(self, *args, **options):
        output = Path(options['output']).resolve()
        if output.exists():
            raise CommandError('Output already exists. Choose a new filename.')
        output.parent.mkdir(parents=True, exist_ok=True)
        cipher = None
        if options['encrypt']:
            from cryptography.fernet import Fernet
            try:
                cipher = Fernet(os.environ['BACKUP_ENCRYPTION_KEY'].encode())
            except (KeyError, ValueError):
                raise CommandError('Set BACKUP_ENCRYPTION_KEY to a valid Fernet key before encrypted backup.')
        database = Path(settings.DATABASES['default']['NAME']).resolve()
        if not database.exists():
            raise CommandError('The database does not exist. Run migrations first.')
        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / 'db.sqlite3'
            with closing(sqlite3.connect(str(database))) as source, closing(sqlite3.connect(str(snapshot))) as target:
                source.backup(target)
            archive_path = Path(folder) / 'backup.zip'
            with zipfile.ZipFile(archive_path, 'x', zipfile.ZIP_DEFLATED) as archive:
                archive.write(snapshot, 'db.sqlite3')
                if settings.MEDIA_ROOT.exists():
                    for file in settings.MEDIA_ROOT.rglob('*'):
                        if file.is_file():
                            archive.write(file, 'media/' + file.relative_to(settings.MEDIA_ROOT).as_posix())
            with output.open('xb') as destination:
                if cipher:
                    destination.write(cipher.encrypt(archive_path.read_bytes()))
                else:
                    import shutil
                    with archive_path.open('rb') as source:
                        shutil.copyfileobj(source, destination)
        self.stdout.write(self.style.SUCCESS(f'Backup saved: {output}'))
