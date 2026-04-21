'use client';

import { useMemo, useState } from 'react';

type RoleKey = 'super_admin' | 'asset_manager' | 'ministry_leader' | 'finance_officer' | 'viewer';

type Asset = {
  id: string;
  name: string;
  category: string;
  location: string;
  department: string;
  custodian: string;
  condition: string;
  status: string;
  purchaseDate: string;
  purchaseValue: number;
  notes: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: RoleKey;
  department: string;
};

const roles: Record<RoleKey, { name: string; permissions: string[]; description: string }> = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full system control.',
    permissions: ['view_dashboard', 'manage_assets', 'create_assets', 'edit_assets', 'assign_assets', 'manage_users', 'view_audit_log', 'export_reports', 'view_asset_values']
  },
  asset_manager: {
    name: 'Asset Manager',
    description: 'Manages church assets and maintenance.',
    permissions: ['view_dashboard', 'manage_assets', 'create_assets', 'edit_assets', 'assign_assets', 'view_audit_log', 'export_reports']
  },
  ministry_leader: {
    name: 'Ministry Leader',
    description: 'Views department items and reports issues.',
    permissions: ['view_dashboard', 'view_department_assets', 'report_damage']
  },
  finance_officer: {
    name: 'Finance Officer',
    description: 'Views values and financial reporting.',
    permissions: ['view_dashboard', 'view_asset_values', 'export_reports']
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access.',
    permissions: ['view_dashboard', 'view_assigned_assets']
  }
};

const sampleAssets: Asset[] = [
  {
    id: 'BCFCN-001',
    name: 'Yamaha Digital Piano',
    category: 'Music',
    location: 'Main Sanctuary',
    department: 'Worship Ministry',
    custodian: 'Worship Leader',
    condition: 'Good',
    status: 'Active',
    purchaseDate: '2023-04-15',
    purchaseValue: 4500,
    notes: 'Used for Sunday worship and special services.'
  },
  {
    id: 'BCFCN-002',
    name: 'Dell Office Laptop',
    category: 'IT',
    location: 'Church Office',
    department: 'Administration',
    custodian: 'Asset Clerk',
    condition: 'Excellent',
    status: 'Assigned',
    purchaseDate: '2024-01-10',
    purchaseValue: 2200,
    notes: 'Used for records and church communication.'
  },
  {
    id: 'BCFCN-003',
    name: 'Plastic Stack Chairs (50)',
    category: 'Furniture',
    location: 'Fellowship Hall',
    department: 'Hospitality',
    custodian: 'Brother C. Young',
    condition: 'Fair',
    status: 'Active',
    purchaseDate: '2022-08-01',
    purchaseValue: 3750,
    notes: 'Some chairs need inspection.'
  },
  {
    id: 'BCFCN-004',
    name: 'Generator',
    category: 'Facilities',
    location: 'Utility Area',
    department: 'Facilities',
    custodian: 'Maintenance Team',
    condition: 'Needs Service',
    status: 'Maintenance',
    purchaseDate: '2021-06-20',
    purchaseValue: 6800,
    notes: 'Quarterly service overdue.'
  }
];

const sampleUsers: User[] = [
  { id: 1, name: 'Pastor Admin', email: 'admin@bcfcn.org', password: 'admin123', role: 'super_admin', department: 'Executive' },
  { id: 2, name: 'Asset Clerk', email: 'assets@bcfcn.org', password: 'assets123', role: 'asset_manager', department: 'Administration' },
  { id: 3, name: 'Worship Leader', email: 'worship@bcfcn.org', password: 'worship123', role: 'ministry_leader', department: 'Worship Ministry' },
  { id: 4, name: 'Finance Officer', email: 'finance@bcfcn.org', password: 'finance123', role: 'finance_officer', department: 'Finance' },
  { id: 5, name: 'General Viewer', email: 'viewer@bcfcn.org', password: 'viewer123', role: 'viewer', department: 'Administration' }
];

const auditLog = [
  { id: 1, action: 'Created asset', actor: 'Asset Clerk', target: 'Dell Office Laptop', date: '2026-04-18 10:30 AM' },
  { id: 2, action: 'Reported maintenance issue', actor: 'Maintenance Team', target: 'Generator', date: '2026-04-17 02:10 PM' },
  { id: 3, action: 'Assigned asset', actor: 'Pastor Admin', target: 'Yamaha Digital Piano', date: '2026-04-14 09:00 AM' }
];

function hasPermission(user: User | null, permission: string) {
  if (!user) return false;
  return roles[user.role].permissions.includes(permission);
}

export default function Page() {
  const [assets, setAssets] = useState<Asset[]>(sampleAssets);
  const [users] = useState<User[]>(sampleUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'assets' | 'users' | 'permissions' | 'audit'>('assets');
  const [newAsset, setNewAsset] = useState<Asset>({
    id: '',
    name: '',
    category: '',
    location: '',
    department: '',
    custodian: '',
    condition: 'Good',
    status: 'Active',
    purchaseDate: '',
    purchaseValue: 0,
    notes: ''
  });

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (currentUser && hasPermission(currentUser, 'view_department_assets') && !hasPermission(currentUser, 'manage_assets')) {
        if (asset.department !== currentUser.department) return false;
      }
      if (currentUser && hasPermission(currentUser, 'view_assigned_assets') && !hasPermission(currentUser, 'manage_assets')) {
        if (asset.custodian !== currentUser.name && asset.department !== currentUser.department) return false;
      }
      const q = search.toLowerCase();
      return [asset.name, asset.id, asset.category, asset.location, asset.department].some((value) =>
        value.toLowerCase().includes(q)
      );
    });
  }, [assets, currentUser, search]);

  const totalValue = filteredAssets.reduce((sum, asset) => sum + asset.purchaseValue, 0);

  const handleLogin = () => {
    const matched = users.find(
      (user) => user.email.toLowerCase() === loginEmail.toLowerCase() && user.password === loginPassword
    );
    if (!matched) {
      setLoginError('Invalid email or password.');
      return;
    }
    setCurrentUser(matched);
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setActiveTab('assets');
  };

  const addAsset = () => {
    if (!currentUser || !hasPermission(currentUser, 'create_assets')) return;
    if (!newAsset.id || !newAsset.name) return;
    setAssets((prev) => [...prev, newAsset]);
    setNewAsset({
      id: '',
      name: '',
      category: '',
      location: '',
      department: '',
      custodian: '',
      condition: 'Good',
      status: 'Active',
      purchaseDate: '',
      purchaseValue: 0,
      notes: ''
    });
  };

  if (!currentUser) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Belize City First Church of the Nazarene</p>
          <h1>Asset Database Login</h1>
          <p className="muted">Secure access for church staff, ministry leaders, and administrators.</p>

          <label>Email Address</label>
          <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="admin@bcfcn.org" type="email" />

          <label>Password</label>
          <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter password" type="password" />

          {loginError ? <div className="error-box">{loginError}</div> : null}
          <button className="primary-btn" onClick={handleLogin}>Sign In</button>

          <div className="demo-box">
            <strong>Demo users</strong>
            <p>Super Admin: admin@bcfcn.org / admin123</p>
            <p>Asset Manager: assets@bcfcn.org / assets123</p>
            <p>Ministry Leader: worship@bcfcn.org / worship123</p>
            <p>Finance Officer: finance@bcfcn.org / finance123</p>
            <p>Viewer: viewer@bcfcn.org / viewer123</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Belize City First Church of the Nazarene</p>
          <h1>Church Asset Database</h1>
          <p className="muted">Track church property, departments, custodians, condition, reporting, and accountability.</p>
          <div className="user-pill">Signed in as <strong>{currentUser.name}</strong> · {roles[currentUser.role].name}</div>
        </div>
        <div className="hero-actions">
          {hasPermission(currentUser, 'export_reports') ? <button className="secondary-btn">Export Report</button> : null}
          <button className="secondary-btn" onClick={handleLogout}>Logout</button>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><span>Total Assets</span><strong>{filteredAssets.length}</strong></div>
        <div className="stat-card"><span>Needs Attention</span><strong>{filteredAssets.filter((a) => a.condition === 'Needs Service' || a.status === 'Maintenance').length}</strong></div>
        <div className="stat-card"><span>Active / Assigned</span><strong>{filteredAssets.filter((a) => a.status === 'Active' || a.status === 'Assigned').length}</strong></div>
        <div className="stat-card"><span>Recorded Value</span><strong>{hasPermission(currentUser, 'view_asset_values') ? `BZ$ ${totalValue.toLocaleString()}` : 'Restricted'}</strong></div>
      </section>

      <section className="tabs-row">
        <button className={activeTab === 'assets' ? 'tab active' : 'tab'} onClick={() => setActiveTab('assets')}>Assets</button>
        {hasPermission(currentUser, 'manage_users') ? <button className={activeTab === 'users' ? 'tab active' : 'tab'} onClick={() => setActiveTab('users')}>Users & Roles</button> : null}
        <button className={activeTab === 'permissions' ? 'tab active' : 'tab'} onClick={() => setActiveTab('permissions')}>Permissions</button>
        {hasPermission(currentUser, 'view_audit_log') ? <button className={activeTab === 'audit' ? 'tab active' : 'tab'} onClick={() => setActiveTab('audit')}>Audit Log</button> : null}
      </section>

      {activeTab === 'assets' && (
        <section className="panel">
          <div className="panel-top">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search asset, category, ID, department..." />
          </div>

          {hasPermission(currentUser, 'create_assets') && (
            <div className="add-asset-grid">
              <input placeholder="Asset ID" value={newAsset.id} onChange={(e) => setNewAsset({ ...newAsset, id: e.target.value })} />
              <input placeholder="Asset Name" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} />
              <input placeholder="Category" value={newAsset.category} onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })} />
              <input placeholder="Location" value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} />
              <input placeholder="Department" value={newAsset.department} onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })} />
              <input placeholder="Custodian" value={newAsset.custodian} onChange={(e) => setNewAsset({ ...newAsset, custodian: e.target.value })} />
              <input placeholder="Condition" value={newAsset.condition} onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })} />
              <input placeholder="Status" value={newAsset.status} onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })} />
              <input placeholder="Purchase Date" value={newAsset.purchaseDate} onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })} />
              <input placeholder="Purchase Value" type="number" value={newAsset.purchaseValue} onChange={(e) => setNewAsset({ ...newAsset, purchaseValue: Number(e.target.value) })} />
              <input className="wide" placeholder="Notes" value={newAsset.notes} onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })} />
              <button className="primary-btn" onClick={addAsset}>Save Asset</button>
            </div>
          )}

          <div className="asset-list">
            {filteredAssets.map((asset) => (
              <article className="asset-card" key={asset.id}>
                <div className="asset-head">
                  <div>
                    <h3>{asset.name}</h3>
                    <p className="muted">{asset.id} · {asset.category} · {asset.status}</p>
                  </div>
                  <div className="asset-actions">
                    {hasPermission(currentUser, 'edit_assets') ? <button className="secondary-btn">Edit</button> : null}
                    {hasPermission(currentUser, 'assign_assets') ? <button className="secondary-btn">Assign</button> : null}
                    {hasPermission(currentUser, 'report_damage') ? <button className="secondary-btn">Report Issue</button> : null}
                  </div>
                </div>
                <div className="asset-meta">
                  <span>Location: {asset.location}</span>
                  <span>Department: {asset.department}</span>
                  <span>Custodian: {asset.custodian}</span>
                  <span>Condition: {asset.condition}</span>
                  <span>Date: {asset.purchaseDate}</span>
                  {hasPermission(currentUser, 'view_asset_values') ? <span>Value: BZ$ {asset.purchaseValue.toLocaleString()}</span> : null}
                </div>
                <p>{asset.notes}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'users' && hasPermission(currentUser, 'manage_users') && (
        <section className="panel grid-two">
          {users.map((user) => (
            <article className="simple-card" key={user.id}>
              <h3>{user.name}</h3>
              <p className="muted">{user.email}</p>
              <p>Department: {user.department}</p>
              <p>Role: {roles[user.role].name}</p>
            </article>
          ))}
        </section>
      )}

      {activeTab === 'permissions' && (
        <section className="panel grid-two">
          {(Object.keys(roles) as RoleKey[]).map((roleKey) => (
            <article className="simple-card" key={roleKey}>
              <h3>{roles[roleKey].name}</h3>
              <p className="muted">{roles[roleKey].description}</p>
              <div className="permission-wrap">
                {roles[roleKey].permissions.map((permission) => (
                  <span className="permission-pill" key={permission}>{permission.replaceAll('_', ' ')}</span>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === 'audit' && hasPermission(currentUser, 'view_audit_log') && (
        <section className="panel">
          {auditLog.map((entry) => (
            <article className="simple-card" key={entry.id}>
              <h3>{entry.action}</h3>
              <p className="muted">{entry.actor} · {entry.target}</p>
              <p>{entry.date}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
