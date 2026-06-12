import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save, ShieldCheck, Trash2, UserCog } from "lucide-react";

import { useConfirm } from "@/admin/context/ConfirmContext";
import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import type { AdminRole, AdminUser, RBACSnapshot } from "@/admin/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const SUPER_ADMIN = "R101";

type UserDraft = {
  ucode: string;
  username: string;
  realName: string;
  password: string;
  status: boolean;
  roleCodes: string[];
};

type RoleDraft = {
  code: string;
  name: string;
  description: string;
  permissionCodes: string[];
  langs: string[];
};

function emptyUser(): UserDraft {
  return { ucode: "", username: "", realName: "", password: "", status: true, roleCodes: [] };
}

function emptyRole(): RoleDraft {
  return { code: "", name: "", description: "", permissionCodes: [], langs: [] };
}

function userDraft(user: AdminUser): UserDraft {
  return {
    ucode: user.ucode,
    username: user.username,
    realName: user.realName,
    password: "",
    status: user.status === "1",
    roleCodes: user.roles.map((role) => role.code),
  };
}

function roleDraft(role: AdminRole): RoleDraft {
  return {
    code: role.code,
    name: role.name,
    description: role.description,
    permissionCodes: role.permissionCodes || [],
    langs: role.langs || [],
  };
}

function toggle(values: string[], code: string, checked: boolean) {
  if (checked) return values.includes(code) ? values : [...values, code];
  return values.filter((item) => item !== code);
}

function requiredMessage(label: string, required: string) {
  return `${label} ${required}`;
}

export default function RBACView() {
  const { client, user, setStatus, clearStatus } = useSession();
  const { t } = useLocale();
  const { confirm } = useConfirm();
  const [snapshot, setSnapshot] = useState<RBACSnapshot>({ users: [], roles: [], permissions: [], languages: [] });
  const [editingUser, setEditingUser] = useState("");
  const [editingRole, setEditingRole] = useState("");
  const [userForm, setUserForm] = useState<UserDraft>(() => emptyUser());
  const [roleForm, setRoleForm] = useState<RoleDraft>(() => emptyRole());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentUserCode = user?.ucode || "";
  const roleOptions = useMemo(
    () => snapshot.roles.map((role) => ({ code: role.code, name: role.name || role.code })),
    [snapshot.roles]
  );
  const isEditingSelf = editingUser !== "" && editingUser === currentUserCode;
  const isSuperRole = editingRole === SUPER_ADMIN || roleForm.code === SUPER_ADMIN;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await client.fetch<RBACSnapshot>("/admin/rbac");
      setSnapshot(result);
      setEditingUser((prev) => {
        if (prev && result.users.some((item) => item.ucode === prev)) return prev;
        const first = result.users[0];
        if (first) setUserForm(userDraft(first));
        return first?.ucode || "";
      });
      setEditingRole((prev) => {
        if (prev && result.roles.some((item) => item.code === prev)) return prev;
        const first = result.roles[0];
        if (first) setRoleForm(roleDraft(first));
        return first?.code || "";
      });
      clearStatus();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.rbac.failedLoad")), "error");
    } finally {
      setLoading(false);
    }
  }, [client, clearStatus, setStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function editUser(item: AdminUser) {
    setEditingUser(item.ucode);
    setUserForm(userDraft(item));
  }

  function newUser() {
    setEditingUser("");
    setUserForm(emptyUser());
  }

  function editRole(item: AdminRole) {
    setEditingRole(item.code);
    setRoleForm(roleDraft(item));
  }

  function newRole() {
    setEditingRole("");
    setRoleForm(emptyRole());
  }

  async function saveUser() {
    const payload = {
      ucode: userForm.ucode.trim(),
      username: userForm.username.trim(),
      realName: userForm.realName.trim(),
      password: userForm.password,
      status: userForm.status ? "1" : "0",
      roleCodes: userForm.roleCodes,
    };
    const required = t("field.required");
    if (!editingUser && !payload.ucode) {
      setStatus(requiredMessage(t("admin.rbac.userCode"), required), "error");
      return;
    }
    if (!payload.username) {
      setStatus(requiredMessage(t("admin.rbac.username"), required), "error");
      return;
    }
    if (!editingUser && !payload.password.trim()) {
      setStatus(requiredMessage(t("admin.rbac.password"), required), "error");
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await client.fetch<{ status: string }>(`/admin/rbac/users/${encodeURIComponent(editingUser)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await client.fetch<{ status: string }>("/admin/rbac/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setEditingUser(payload.ucode);
      }
      setStatus(t("admin.rbac.saved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.rbac.failedSave")), "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!editingUser || isEditingSelf) return;
    const confirmed = await confirm({
      description: t("admin.rbac.deleteUserConfirm", { code: editingUser }),
      detail: userForm.username || editingUser,
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await client.fetch<{ status: string }>(`/admin/rbac/users/${encodeURIComponent(editingUser)}`, {
        method: "DELETE",
      });
      setStatus(t("admin.rbac.deleted"));
      newUser();
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.rbac.failedDelete")), "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveRole() {
    const payload = {
      code: roleForm.code.trim(),
      name: roleForm.name.trim(),
      description: roleForm.description.trim(),
      permissionCodes: roleForm.permissionCodes,
      langs: isSuperRole ? [] : roleForm.langs,
    };
    const required = t("field.required");
    if (!editingRole && !payload.code) {
      setStatus(requiredMessage(t("admin.rbac.roleCode"), required), "error");
      return;
    }
    if (!payload.name) {
      setStatus(requiredMessage(t("admin.rbac.roleName"), required), "error");
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        await client.fetch<{ status: string }>(`/admin/rbac/roles/${encodeURIComponent(editingRole)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await client.fetch<{ status: string }>("/admin/rbac/roles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setEditingRole(payload.code);
      }
      setStatus(t("admin.rbac.saved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.rbac.failedSave")), "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole() {
    if (!editingRole || editingRole === SUPER_ADMIN) return;
    const confirmed = await confirm({
      description: t("admin.rbac.deleteRoleConfirm", { code: editingRole }),
      detail: roleForm.name || editingRole,
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await client.fetch<{ status: string }>(`/admin/rbac/roles/${encodeURIComponent(editingRole)}`, {
        method: "DELETE",
      });
      setStatus(t("admin.rbac.deleted"));
      newRole();
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.rbac.failedDelete")), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.rbac")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.rbac.workspaceDesc")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden="true" size={16} />
          {t("admin.common.refresh")}
        </Button>
      </div>

      <Tabs defaultValue="users" className="grid gap-5">
        <TabsList className="w-fit">
          <TabsTrigger value="users">{t("admin.rbac.users")}</TabsTrigger>
          <TabsTrigger value="roles">{t("admin.rbac.roles")}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>{t("admin.rbac.userCode")}</TableHead>
                  <TableHead>{t("admin.rbac.username")}</TableHead>
                  <TableHead>{t("admin.rbac.roles")}</TableHead>
                  <TableHead>{t("admin.rbac.status")}</TableHead>
                  <TableHead>{t("admin.common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("admin.common.loading")}
                    </TableCell>
                  </TableRow>
                ) : snapshot.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("admin.rbac.noUsers")}
                    </TableCell>
                  </TableRow>
                ) : (
                  snapshot.users.map((item) => (
                    <TableRow key={item.ucode} className={editingUser === item.ucode ? "bg-muted/40" : undefined}>
                      <TableCell className="font-mono text-xs">{item.ucode}</TableCell>
                      <TableCell>{item.realName || item.username}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.roles.map((role) => (
                            <Badge key={role.code} variant="outline">
                              {role.name || role.code}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{item.status === "1" ? t("admin.rbac.enabled") : t("admin.rbac.disabled")}</TableCell>
                      <TableCell>
                        <Button type="button" size="sm" variant="outline" onClick={() => editUser(item)}>
                          {t("admin.common.open")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <aside className="grid gap-4 rounded-md border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {editingUser ? t("admin.rbac.editUser") : t("admin.rbac.newUser")}
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={newUser}>
                <Plus aria-hidden="true" size={14} />
                {t("admin.rbac.newUser")}
              </Button>
            </div>
            <div className="grid gap-3">
              <Label>{t("admin.rbac.userCode")}</Label>
              <Input
                value={userForm.ucode}
                required
                aria-required="true"
                disabled={Boolean(editingUser)}
                onChange={(event) => setUserForm((prev) => ({ ...prev, ucode: event.target.value }))}
              />
              <Label>{t("admin.rbac.username")}</Label>
              <Input
                value={userForm.username}
                required
                aria-required="true"
                onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
              />
              <Label>{t("admin.rbac.realName")}</Label>
              <Input
                value={userForm.realName}
                onChange={(event) => setUserForm((prev) => ({ ...prev, realName: event.target.value }))}
              />
              <Label>{editingUser ? t("admin.rbac.newPassword") : t("admin.rbac.password")}</Label>
              <Input
                type="password"
                value={userForm.password}
                required={!editingUser}
                aria-required={!editingUser}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              />
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label>{t("admin.rbac.enabled")}</Label>
                <Switch
                  checked={userForm.status}
                  disabled={isEditingSelf}
                  onCheckedChange={(checked) => setUserForm((prev) => ({ ...prev, status: checked }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.rbac.roles")}</Label>
                <div className="grid max-h-52 gap-2 overflow-auto rounded-md border p-3">
                  {roleOptions.map((role) => (
                    <label key={role.code} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={userForm.roleCodes.includes(role.code)}
                        disabled={isEditingSelf && role.code === SUPER_ADMIN}
                        onCheckedChange={(checked) =>
                          setUserForm((prev) => ({
                            ...prev,
                            roleCodes: toggle(prev.roleCodes, role.code, checked === true),
                          }))
                        }
                      />
                      <span>{role.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{role.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void deleteUser()}
                disabled={!editingUser || isEditingSelf || saving}
              >
                <Trash2 aria-hidden="true" size={16} />
                {t("admin.common.delete")}
              </Button>
              <Button type="button" onClick={() => void saveUser()} disabled={saving}>
                <Save aria-hidden="true" size={16} />
                {saving ? t("admin.common.saving") : t("admin.common.save")}
              </Button>
            </div>
          </aside>
        </TabsContent>

        <TabsContent value="roles" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>{t("admin.rbac.roleCode")}</TableHead>
                  <TableHead>{t("admin.rbac.roleName")}</TableHead>
                  <TableHead>{t("admin.rbac.permissionCount")}</TableHead>
                  <TableHead>{t("admin.rbac.languages")}</TableHead>
                  <TableHead>{t("admin.common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.roles.map((item) => (
                  <TableRow key={item.code} className={editingRole === item.code ? "bg-muted/40" : undefined}>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.permissionCodes.length}</TableCell>
                    <TableCell>
                      {item.code === SUPER_ADMIN ? t("admin.rbac.allLanguages") : item.langs.join(", ") || "-"}
                    </TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" onClick={() => editRole(item)}>
                        {t("admin.common.open")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <aside className="grid gap-4 rounded-md border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <UserCog aria-hidden="true" size={16} />
                {editingRole ? t("admin.rbac.editRole") : t("admin.rbac.newRole")}
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={newRole}>
                <Plus aria-hidden="true" size={14} />
                {t("admin.rbac.newRole")}
              </Button>
            </div>
            {isSuperRole ? (
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t("admin.rbac.superAdminNote")}
              </p>
            ) : null}
            <div className="grid gap-3">
              <Label>{t("admin.rbac.roleCode")}</Label>
              <Input
                value={roleForm.code}
                required
                aria-required="true"
                disabled={Boolean(editingRole)}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, code: event.target.value }))}
              />
              <Label>{t("admin.rbac.roleName")}</Label>
              <Input
                value={roleForm.name}
                required
                aria-required="true"
                onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Label>{t("admin.rbac.description")}</Label>
              <Textarea
                value={roleForm.description}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <Label>{t("admin.rbac.permissions")}</Label>
              <div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3">
                {snapshot.permissions.map((item) => (
                  <label key={item.code} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={roleForm.permissionCodes.includes(item.code)}
                      disabled={isSuperRole}
                      onCheckedChange={(checked) =>
                        setRoleForm((prev) => ({
                          ...prev,
                          permissionCodes: toggle(prev.permissionCodes, item.code, checked === true),
                        }))
                      }
                    />
                    <span className="truncate font-mono text-xs">{item.code}</span>
                    <span />
                    <span className="text-xs text-muted-foreground">{item.description || "-"}</span>
                  </label>
                ))}
              </div>
              <Label>{t("admin.rbac.languages")}</Label>
              <div className="grid gap-2 rounded-md border p-3">
                {snapshot.languages.map((item) => (
                  <label key={item.code} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={roleForm.langs.includes(item.code)}
                      disabled={isSuperRole}
                      onCheckedChange={(checked) =>
                        setRoleForm((prev) => ({ ...prev, langs: toggle(prev.langs, item.code, checked === true) }))
                      }
                    />
                    <span>{item.name || item.code}</span>
                    <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void deleteRole()}
                disabled={!editingRole || editingRole === SUPER_ADMIN || saving}
              >
                <Trash2 aria-hidden="true" size={16} />
                {t("admin.common.delete")}
              </Button>
              <Button type="button" onClick={() => void saveRole()} disabled={saving}>
                <Save aria-hidden="true" size={16} />
                {saving ? t("admin.common.saving") : t("admin.common.save")}
              </Button>
            </div>
          </aside>
        </TabsContent>
      </Tabs>
    </section>
  );
}
