import sqlite3
import tempfile
import zipfile
from contextlib import closing
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create an online SQLite backup and archive uploaded shop media.'

    def add_arguments(self, parser):
        parser.add_argument('--output', required=True)

    def handle(self, *args, **options):
        output = Path(options['output']).resolve()
        if output.exists():
            raise CommandError('Output already exists. Choose a new filename.')
        output.parent.mkdir(parents=True, exist_ok=True)
        database = Path(settings.DATABASES['default']['NAME']).resolve()
        if not database.exists():
            raise CommandError('The database does not exist. Run migrations first.')
        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / 'db.sqlite3'
            with closing(sqlite3.connect(str(database))) as source, closing(sqlite3.connect(str(snapshot))) as target:
                source.backup(target)
            with zipfile.ZipFile(output, 'x', zipfile.ZIP_DEFLATED) as archive:
                archive.write(snapshot, 'db.sqlite3')
                if settings.MEDIA_ROOT.exists():
                    for file in settings.MEDIA_ROOT.rglob('*'):
                        if file.is_file():
                            archive.write(file, 'media/' + file.relative_to(settings.MEDIA_ROOT).as_posix())
        self.stdout.write(self.style.SUCCESS(f'Backup saved: {output}'))
