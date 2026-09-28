from rest_framework.exceptions import PermissionDenied

ALL = ['products.write', 'prices.write', 'inventory.adjust', 'customers.write',
       'billing.create', 'billing.discount', 'invoices.void', 'ledger.payment',
       'ledger.adjust', 'reports.view', 'settings.manage', 'staff.manage']
DEFAULTS = {
    'OWNER': ALL,
    'MANAGER': [p for p in ALL if p not in ['settings.manage', 'staff.manage']],
    'CASHIER': ['customers.write', 'billing.create', 'ledger.payment'],
}


def permissions_for(user):
    if not user.is_authenticated or not hasattr(user, 'profile'):
        return []
    return ALL if user.profile.role == 'OWNER' else user.profile.permissions


def require(user, permission):
    if permission not in permissions_for(user):
        raise PermissionDenied('Your role does not allow this action.')
