"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { Shield, Users, Package, MapPin, Search, ClipboardList, AlertTriangle, Plus, Upload, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RoleKey = "super_admin" | "asset_manager" | "ministry_leader" | "finance_officer" | "viewer";

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
  purchaseValue: number | string;
  serialNumber?: string;
  lastInventoryDate?: string;
  notes?: string;
};

type AppUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: RoleKey;
  department: string;
};

const roles: Record<RoleKey, { name: string; description: string; permissions: string[] }> = {
  super_admin: {
    name: "Super Admin",
    description: "Full control of users, settings, assets, approvals, and reports.",
    permissions: [
      "view_dashboard",
      "manage_assets",
      "create_assets",
      "edit_assets",
      "assign_assets",
      "manage_users",
      "approve_disposals",
      "view_audit_log",
      "export_reports",
      "manage_settings",
      "view_asset_values",
    ],
  },
  asset_manager: {
    name: "Asset Manager",
    description: "Manages church property, updates records, and reviews maintenance.",
    permissions: [
      "view_dashboard",
      "manage_assets",
      "create_assets",
      "edit_assets",
      "assign_assets",
      "schedule_maintenance",
      "export_reports",
    ],
  },
  ministry_leader: {
    name: "Ministry Leader",
    description: "Views items assigned to a ministry or department and reports issues.",
    permissions: [
      "view_dashboard",
      "view_department_assets",
      "report_damage",
      "view_basic_reports",
    ],
  },
  finance_officer: {
    name: "Finance Officer",
    description: "Reviews cost, valuation, and disposal approvals.",
    permissions: [
      "view_dashboard",
      "view_financial_reports",
      "export_reports",
      "approve_disposals",
      "view_asset_values",
    ],
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to selected records and summaries.",
    permissions: ["view_dashboard", "view_assigned_assets"],
  },
};

const emptyAsset: Asset = {
  id: "",
  name: "",
  category: "",
  location: "",
  department: "",
  custodian: "",
  condition: "Good",
  status: "Active",
  purchaseDate: "",
  purchaseValue: "",
  serialNumber: "",
  lastInventoryDate: "",
  notes: "",
};

const fallbackAssets: Asset[] = [
  {
    id: "BCFCN-001",
    name: "Yamaha Digital Piano",
    category: "Music",
    location: "Main Sanctuary",
    department: "Worship Ministry",
    custodian: "Sister A. Martinez",
    condition: "Good",
    status: "Active",
    purchaseDate: "2023-04-15",
    purchaseValue: 4500,
    serialNumber: "",
    lastInventoryDate: "",
    notes: "Used for Sunday worship and special services.",
  },
  {
    id: "BCFCN-002",
    name: "Dell Office Laptop",
    category: "IT",
    location: "Church Office",
    department: "Administration",
    custodian: "Office Secretary",
    condition: "Excellent",
    status: "Assigned",
    purchaseDate: "2024-01-10",
    purchaseValue: 2200,
    serialNumber: "",
    lastInventoryDate: "",
    notes: "Used for attendance, finance records, and communication.",
  },
];

const fallbackUsers: AppUser[] = [
  { id: 1, name: "Pastor Admin", email: "admin@bcfcn.org", password: "admin123", role: "super_admin", department: "Executive" },
  { id: 2, name: "Asset Clerk", email: "assets@bcfcn.org", password: "assets123", role: "asset_manager", department: "Administration" },
  { id: 3, name: "Worship Leader", email: "worship@bcfcn.org", password: "worship123", role: "ministry_leader", department: "Worship Ministry" },
  { id: 4, name: "Finance Officer", email: "finance@bcfcn.org", password: "finance123", role: "finance_officer", department: "Finance" },
  { id: 5, name: "Read Only User", email: "viewer@bcfcn.org", password: "viewer123", role: "viewer", department: "General" },
];

const auditLog = [
  { id: 1, action: "Created asset", actor: "Asset Clerk", target: "Dell Office Laptop", date: "2026-04-18 10:30 AM" },
  { id: 2, action: "Reported maintenance issue", actor: "Maintenance Team", target: "Generator", date: "2026-04-17 02:10 PM" },
  { id: 3, action: "Assigned asset", actor: "Pastor Admin", target: "Yamaha Digital Piano", date: "2026-04-14 09:00 AM" },
];

function hasPermission(user: AppUser | null, permission: string) {
  if (!user) return false;
  return roles[user.role]?.permissions?.includes(permission);
}

function mapAssetRecord(row: any): Asset {
  return {
    id: row.asset_id,
    name: row.name || "",
    category: row.category || "",
    location: row.location || "",
    department: row.department || "",
    custodian: row.custodian || "",
    condition: row.condition || "Good",
    status: row.status || "Active",
    purchaseDate: row.purchase_date || "",
    purchaseValue: Number(row.purchase_value || 0),
    serialNumber: row.serial_number || "",
    lastInventoryDate: row.last_inventory_date || "",
    notes: row.notes || "",
  };
}

function StatCard({ title, value, icon: Icon, subtitle }: { title: string; value: string | number; icon: any; subtitle: string }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="mt-2 text-3xl font-bold">{value}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-2xl border p-3">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionBadge({ permission }: { permission: string }) {
  return <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">{permission.replaceAll("_", " ")}</Badge>;
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedRole, setSelectedRole] = useState<RoleKey>("super_admin");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [newAsset, setNewAsset] = useState<Asset>(emptyAsset);
  const [editingAsset, setEditingAsset] = useState<(Asset & { originalId?: string }) | null>(null);
  const [assetEditMessage, setAssetEditMessage] = useState("");
  const [assetEditError, setAssetEditError] = useState("");
  const [saveAssetError, setSaveAssetError] = useState("");

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userEditMessage, setUserEditMessage] = useState("");
  const [userEditError, setUserEditError] = useState("");

  useEffect(() => {
    const loadCloudData = async () => {
      setLoading(true);

      const [{ data: assetRows, error: assetError }, { data: userRows, error: userError }] = await Promise.all([
        supabase.from("assets").select("*").order("name"),
        supabase.from("app_users").select("*").order("name"),
      ]);

      setAssets(!assetError && assetRows ? assetRows.map(mapAssetRecord) : fallbackAssets);
      setUsers(!userError && userRows ? userRows : fallbackUsers);
      setLoading(false);
    };

    loadCloudData();
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (currentUser && hasPermission(currentUser, "view_department_assets") && !hasPermission(currentUser, "manage_assets")) {
        if (asset.department !== currentUser.department) return false;
      }

      if (currentUser && hasPermission(currentUser, "view_assigned_assets") && !hasPermission(currentUser, "manage_assets")) {
        if (asset.custodian !== currentUser.name && asset.department !== currentUser.department) return false;
      }

      const q = search.toLowerCase();
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.id.toLowerCase().includes(q) ||
        asset.category.toLowerCase().includes(q) ||
        asset.location.toLowerCase().includes(q) ||
        asset.department.toLowerCase().includes(q)
      );
    });
  }, [assets, search, currentUser]);

  const filteredUsers = useMemo(() => {
    if (!currentUser || !hasPermission(currentUser, "manage_users")) return [];
    if (roleFilter === "all") return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter, currentUser]);

  const stats = {
    totalAssets: assets.length,
    activeAssets: assets.filter((a) => a.status === "Active" || a.status === "Assigned").length,
    needsAttention: assets.filter((a) => a.condition === "Needs Service" || a.status === "Maintenance").length,
    totalValue: assets.reduce((sum, a) => sum + Number(a.purchaseValue || 0), 0),
  };

  const handleLogin = () => {
    const matchedUser = users.find(
      (user) => user.email.toLowerCase() === loginEmail.toLowerCase() && user.password === loginPassword,
    );

    if (!matchedUser) {
      setLoginError("Invalid email or password.");
      return;
    }

    setCurrentUser(matchedUser);
    setIsAuthenticated(true);
    setLoginError("");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginEmail("");
    setLoginPassword("");
    setEditingAsset(null);
    setEditingUser(null);
  };

  const addAsset = async () => {
    if (!currentUser || !hasPermission(currentUser, "create_assets")) return;
    if (!newAsset.id || !newAsset.name) {
      setSaveAssetError("Asset ID and Asset Name are required.");
      return;
    }

    const payload = {
      asset_id: newAsset.id,
      name: newAsset.name,
      category: newAsset.category,
      location: newAsset.location,
      department: newAsset.department,
      custodian: newAsset.custodian,
      condition: newAsset.condition,
      status: newAsset.status,
      purchase_date: newAsset.purchaseDate || null,
      purchase_value: Number(newAsset.purchaseValue || 0),
      serial_number: newAsset.serialNumber || null,
      last_inventory_date: newAsset.lastInventoryDate || null,
      notes: newAsset.notes || null,
    };

    const { data, error } = await supabase.from("assets").insert(payload).select().single();

    if (error) {
      setSaveAssetError("Could not save asset. Check if the Asset ID already exists.");
      return;
    }

    if (data) {
      setAssets((prev) => [...prev, mapAssetRecord(data)]);
      setNewAsset(emptyAsset);
      setSaveAssetError("");
    }
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset || !currentUser || !hasPermission(currentUser, "edit_assets")) return;

    const originalId = editingAsset.originalId || editingAsset.id;

    const payload = {
      asset_id: editingAsset.id,
      name: editingAsset.name,
      category: editingAsset.category,
      location: editingAsset.location,
      department: editingAsset.department,
      custodian: editingAsset.custodian,
      condition: editingAsset.condition,
      status: editingAsset.status,
      purchase_date: editingAsset.purchaseDate || null,
      purchase_value: Number(editingAsset.purchaseValue || 0),
      serial_number: editingAsset.serialNumber || null,
      last_inventory_date: editingAsset.lastInventoryDate || null,
      notes: editingAsset.notes || null,
    };

    const { data, error } = await supabase
      .from("assets")
      .update(payload)
      .eq("asset_id", originalId)
      .select()
      .single();

    if (error) {
      setAssetEditError("Could not update asset.");
      setAssetEditMessage("");
      return;
    }

    if (data) {
      const mapped = mapAssetRecord(data);
      setAssets((prev) => prev.map((asset) => (asset.id === originalId ? mapped : asset)));
      setAssetEditError("");
      setAssetEditMessage("Asset updated successfully.");
    }
  };

  const handleSaveUserCredentials = async () => {
    if (!editingUser) return;

    if (!editingUser.name || !editingUser.email) {
      setUserEditError("Name and email are required.");
      setUserEditMessage("");
      return;
    }

    if (!editingUser.password || editingUser.password.length < 8) {
      setUserEditError("Password must be at least 8 characters long.");
      setUserEditMessage("");
      return;
    }

    const duplicateEmail = users.find(
      (user) => user.id !== editingUser.id && user.email.toLowerCase() === editingUser.email.toLowerCase(),
    );

    if (duplicateEmail) {
      setUserEditError("Another user already uses that email address.");
      setUserEditMessage("");
      return;
    }

    const { error } = await supabase.from("app_users").upsert({
      id: editingUser.id,
      name: editingUser.name,
      email: editingUser.email,
      password: editingUser.password,
      role: editingUser.role,
      department: editingUser.department,
    });

    if (error) {
      setUserEditError("Could not save user changes.");
      setUserEditMessage("");
      return;
    }

    const updatedUsers = users.map((user) => (user.id === editingUser.id ? editingUser : user));
    setUsers(updatedUsers);

    if (currentUser?.id === editingUser.id) {
      setCurrentUser(editingUser);
    }

    setUserEditError("");
    setUserEditMessage("User credentials updated successfully.");
  };

  const handleExportAssets = () => {
    const rows = assets.map((asset) => ({
      "Asset ID": asset.id,
      "Asset Name": asset.name,
      Category: asset.category,
      Description: asset.notes || "",
      Location: asset.location,
      Department: asset.department,
      Custodian: asset.custodian,
      "Serial Number": asset.serialNumber || "",
      "Purchase Date": asset.purchaseDate,
      "Purchase Value": asset.purchaseValue,
      Condition: asset.condition,
      Status: asset.status,
      "Last Inventory Date": asset.lastInventoryDate || "",
      Notes: asset.notes || "",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asset Register");
    XLSX.writeFile(workbook, "BCFCN_Asset_Register.xlsx");
  };

  const handleImportAssets = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];

    const importedAssets = rows
      .map((row, index) => ({
        asset_id: row["Asset ID"] || `IMPORTED-${index + 1}`,
        name: row["Asset Name"] || row["Name"] || "Unnamed Asset",
        category: row["Category"] || "Uncategorized",
        location: row["Location"] || "Unknown",
        department: row["Department"] || "General",
        custodian: row["Custodian"] || "Unassigned",
        condition: row["Condition"] || "Good",
        status: row["Status"] || "Active",
        purchase_date: row["Purchase Date"] || null,
        purchase_value: Number(row["Purchase Value"] || 0),
        serial_number: row["Serial Number"] || null,
        last_inventory_date: row["Last Inventory Date"] || null,
        notes: row["Notes"] || row["Description"] || "",
      }))
      .filter((asset) => asset.name);

    const { data, error } = await supabase.from("assets").upsert(importedAssets, { onConflict: "asset_id" }).select();

    if (!error && data) {
      setAssets(data.map(mapAssetRecord));
    }

    event.target.value = "";
  };

  const triggerImport = () => fileInputRef.current?.click();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading church asset system...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="rounded-3xl border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="mb-6 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Belize City First Church of the Nazarene</p>
                <h1 className="mt-3 text-3xl font-bold">Asset Database Login</h1>
                <p className="mt-2 text-sm text-muted-foreground">Secure access for church staff, ministry leaders, and administrators.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="admin@bcfcn.org" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="mt-1 rounded-2xl" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" placeholder="Enter password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="mt-1 rounded-2xl" />
                </div>
                {loginError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{loginError}</div> : null}
                <Button onClick={handleLogin} className="w-full rounded-2xl py-6 text-base">Sign In</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-[1.6fr_.9fr]">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Belize City First Church of the Nazarene</p>
                  <h1 className="mt-2 text-3xl font-bold md:text-4xl">Church Asset Database</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A web-based inventory and stewardship system for tracking church property, user roles, permissions, locations, maintenance, and accountability.</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm">
                    <span className="font-medium">Signed in as:</span>
                    <span>{currentUser.name}</span>
                    <Badge variant="secondary">{roles[currentUser.role].name}</Badge>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={handleLogout} className="rounded-2xl">Logout</Button>
                  {hasPermission(currentUser, "export_reports") ? <Button onClick={handleExportAssets} className="rounded-2xl"><Download className="mr-2 h-4 w-4" />Export Excel</Button> : null}
                  {hasPermission(currentUser, "create_assets") ? <Button variant="outline" onClick={triggerImport} className="rounded-2xl"><Upload className="mr-2 h-4 w-4" />Import Excel</Button> : null}
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportAssets} />
                  {hasPermission(currentUser, "create_assets") ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-2xl"><Plus className="mr-2 h-4 w-4" />Add Asset</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>Add New Asset</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div><Label>Asset ID</Label><Input value={newAsset.id} onChange={(e) => setNewAsset({ ...newAsset, id: e.target.value })} placeholder="BCFCN-005" /></div>
                          <div><Label>Asset Name</Label><Input value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="Projector" /></div>
                          <div><Label>Category</Label><Input value={newAsset.category} onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })} placeholder="Media" /></div>
                          <div><Label>Location</Label><Input value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} placeholder="Sanctuary" /></div>
                          <div><Label>Department</Label><Input value={newAsset.department} onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })} placeholder="Media Ministry" /></div>
                          <div><Label>Custodian</Label><Input value={newAsset.custodian} onChange={(e) => setNewAsset({ ...newAsset, custodian: e.target.value })} placeholder="Assigned person" /></div>
                          <div><Label>Condition</Label><Input value={newAsset.condition} onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })} /></div>
                          <div><Label>Status</Label><Input value={newAsset.status} onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })} /></div>
                          <div><Label>Purchase Date</Label><Input type="date" value={newAsset.purchaseDate} onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })} /></div>
                          <div><Label>Purchase Value</Label><Input type="number" value={newAsset.purchaseValue} onChange={(e) => setNewAsset({ ...newAsset, purchaseValue: e.target.value })} /></div>
                          <div><Label>Serial Number</Label><Input value={newAsset.serialNumber} onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })} /></div>
                          <div><Label>Last Inventory Date</Label><Input type="date" value={newAsset.lastInventoryDate} onChange={(e) => setNewAsset({ ...newAsset, lastInventoryDate: e.target.value })} /></div>
                          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={newAsset.notes} onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })} /></div>
                          {saveAssetError ? <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{saveAssetError}</div> : null}
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={addAsset} className="rounded-2xl">Save Asset</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5" />Role Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedRole} onValueChange={(value: RoleKey) => setSelectedRole(value)}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roles).map(([key, role]) => (
                    <SelectItem key={key} value={key}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <h3 className="font-semibold">{roles[selectedRole].name}</h3>
                <p className="text-sm text-muted-foreground">{roles[selectedRole].description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {roles[selectedRole].permissions.map((permission) => <PermissionBadge key={permission} permission={permission} />)}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Assets" value={stats.totalAssets} icon={Package} subtitle="All registered property items" />
          <StatCard title="In Use" value={stats.activeAssets} icon={ClipboardList} subtitle="Active or assigned assets" />
          <StatCard title="Needs Attention" value={stats.needsAttention} icon={AlertTriangle} subtitle="Maintenance or service required" />
          <StatCard title="Recorded Value" value={`BZ$ ${stats.totalValue.toLocaleString()}`} icon={Package} subtitle="Purchase value on file" />
        </div>

        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            {hasPermission(currentUser, "manage_users") ? <TabsTrigger value="users">Users & Roles</TabsTrigger> : null}
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            {hasPermission(currentUser, "view_audit_log") ? <TabsTrigger value="audit">Audit Log</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="assets">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Asset Register</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="rounded-2xl pl-9" placeholder="Search asset, category, ID, department..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="text-sm text-muted-foreground">Track by location, department, status, and custodian.</div>
                </div>
                <div className="grid gap-4">
                  {filteredAssets.map((asset) => (
                    <motion.div key={asset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className="rounded-2xl border">
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold">{asset.name}</h3>
                                <Badge>{asset.id}</Badge>
                                <Badge variant="outline">{asset.category}</Badge>
                                <Badge variant="secondary">{asset.status}</Badge>
                              </div>
                              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{asset.location}</div>
                                <div>Department: {asset.department}</div>
                                <div>Custodian: {asset.custodian}</div>
                                <div>Condition: {asset.condition}</div>
                                <div>Purchase Date: {asset.purchaseDate || "-"}</div>
                                {hasPermission(currentUser, "view_asset_values") ? <div>Value: BZ$ {Number(asset.purchaseValue).toLocaleString()}</div> : null}
                              </div>
                              <p className="text-sm">{asset.notes}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {hasPermission(currentUser, "edit_assets") ? (
                                <Dialog onOpenChange={(open) => {
                                  if (!open) {
                                    setEditingAsset(null);
                                    setAssetEditError("");
                                    setAssetEditMessage("");
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" className="rounded-2xl" onClick={() => setEditingAsset({ ...asset, originalId: asset.id })}>Edit</Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl rounded-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Edit Asset</DialogTitle>
                                    </DialogHeader>
                                    {editingAsset ? (
                                      <div className="grid gap-4 md:grid-cols-2">
                                        <div><Label>Asset ID</Label><Input value={editingAsset.id || ""} onChange={(e) => setEditingAsset({ ...editingAsset, id: e.target.value })} /></div>
                                        <div><Label>Asset Name</Label><Input value={editingAsset.name || ""} onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })} /></div>
                                        <div><Label>Category</Label><Input value={editingAsset.category || ""} onChange={(e) => setEditingAsset({ ...editingAsset, category: e.target.value })} /></div>
                                        <div><Label>Location</Label><Input value={editingAsset.location || ""} onChange={(e) => setEditingAsset({ ...editingAsset, location: e.target.value })} /></div>
                                        <div><Label>Department</Label><Input value={editingAsset.department || ""} onChange={(e) => setEditingAsset({ ...editingAsset, department: e.target.value })} /></div>
                                        <div><Label>Custodian</Label><Input value={editingAsset.custodian || ""} onChange={(e) => setEditingAsset({ ...editingAsset, custodian: e.target.value })} /></div>
                                        <div><Label>Condition</Label><Input value={editingAsset.condition || ""} onChange={(e) => setEditingAsset({ ...editingAsset, condition: e.target.value })} /></div>
                                        <div><Label>Status</Label><Input value={editingAsset.status || ""} onChange={(e) => setEditingAsset({ ...editingAsset, status: e.target.value })} /></div>
                                        <div><Label>Purchase Date</Label><Input type="date" value={editingAsset.purchaseDate || ""} onChange={(e) => setEditingAsset({ ...editingAsset, purchaseDate: e.target.value })} /></div>
                                        <div><Label>Purchase Value</Label><Input type="number" value={editingAsset.purchaseValue || ""} onChange={(e) => setEditingAsset({ ...editingAsset, purchaseValue: e.target.value })} /></div>
                                        <div><Label>Serial Number</Label><Input value={editingAsset.serialNumber || ""} onChange={(e) => setEditingAsset({ ...editingAsset, serialNumber: e.target.value })} /></div>
                                        <div><Label>Last Inventory Date</Label><Input type="date" value={editingAsset.lastInventoryDate || ""} onChange={(e) => setEditingAsset({ ...editingAsset, lastInventoryDate: e.target.value })} /></div>
                                        <div className="md:col-span-2"><Label>Notes</Label><Textarea value={editingAsset.notes || ""} onChange={(e) => setEditingAsset({ ...editingAsset, notes: e.target.value })} /></div>
                                        {assetEditError ? <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{assetEditError}</div> : null}
                                        {assetEditMessage ? <div className="md:col-span-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{assetEditMessage}</div> : null}
                                        <div className="md:col-span-2 flex justify-end">
                                          <Button onClick={handleUpdateAsset} className="rounded-2xl">Save Changes</Button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </DialogContent>
                                </Dialog>
                              ) : null}
                              {hasPermission(currentUser, "assign_assets") ? <Button className="rounded-2xl">Assign</Button> : null}
                              {hasPermission(currentUser, "report_damage") ? <Button variant="secondary" className="rounded-2xl">Report Issue</Button> : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            {hasPermission(currentUser, "manage_users") ? (
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Users and Access Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">Each user belongs to a role that determines what they can see and change.</div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full rounded-2xl md:w-64"><SelectValue placeholder="Filter by role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {Object.entries(roles).map(([key, role]) => <SelectItem key={key} value={key}>{role.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} className="rounded-2xl border">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <p className="mt-2 text-sm">Department: {user.department}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge>{roles[user.role].name}</Badge>
                              <Dialog onOpenChange={(open) => {
                                if (!open) {
                                  setEditingUser(null);
                                  setUserEditError("");
                                  setUserEditMessage("");
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" className="rounded-2xl" onClick={() => setEditingUser({ ...user })}>Edit Credentials</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Edit User Credentials</DialogTitle>
                                  </DialogHeader>
                                  {editingUser ? (
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Name</Label>
                                        <Input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} className="mt-1 rounded-2xl" />
                                      </div>
                                      <div>
                                        <Label>Email</Label>
                                        <Input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="mt-1 rounded-2xl" />
                                      </div>
                                      <div>
                                        <Label>Password</Label>
                                        <Input type="password" value={editingUser.password || ""} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} className="mt-1 rounded-2xl" />
                                      </div>
                                      <div>
                                        <Label>Role</Label>
                                        <Select value={editingUser.role} onValueChange={(value: RoleKey) => setEditingUser({ ...editingUser, role: value })}>
                                          <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(roles).map(([key, role]) => <SelectItem key={key} value={key}>{role.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label>Department</Label>
                                        <Input value={editingUser.department || ""} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })} className="mt-1 rounded-2xl" />
                                      </div>
                                      {userEditError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{userEditError}</div> : null}
                                      {userEditMessage ? <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{userEditMessage}</div> : null}
                                      <div className="flex justify-end">
                                        <Button onClick={handleSaveUserCredentials} className="rounded-2xl">Save User</Button>
                                      </div>
                                    </div>
                                  ) : null}
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-8 text-sm text-muted-foreground">You do not have permission to manage users.</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="permissions">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(roles).map(([key, role]) => (
                <Card key={key} className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <CardTitle>{role.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission) => <PermissionBadge key={permission} permission={permission} />)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audit">
            {hasPermission(currentUser, "view_audit_log") ? (
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>Audit Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditLog.map((entry) => (
                      <Card key={entry.id} className="rounded-2xl border">
                        <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium">{entry.action}</p>
                            <p className="text-sm text-muted-foreground">{entry.actor} • {entry.target}</p>
                          </div>
                          <Badge variant="outline">{entry.date}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-8 text-sm text-muted-foreground">You do not have permission to view the audit log.</CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
