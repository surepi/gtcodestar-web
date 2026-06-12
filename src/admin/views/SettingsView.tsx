import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Copy, RefreshCw, Settings, Upload } from "lucide-react";

import { useLocale } from "@/admin/context/LocaleContext";
import { useSession } from "@/admin/context/SessionContext";
import { errorMessage } from "@/admin/lib/client";
import { copyTextToClipboard } from "@/admin/lib/clipboard";
import type {
  CompanySettings,
  ConfigItem,
  ConfigResponse,
  LabelItem,
  SiteSettings,
  UploadResult,
} from "@/admin/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type SettingsTab = "site" | "company" | "config" | "labels" | "upload";

const TOGGLE_CONFIG_KEYS = new Set(["form_status", "message_status", "message_verify"]);
const TEXT_CONFIG_KEYS = new Set(["ai_admin_token", "ai_admin_username"]);
const ACTIVE_CONFIG_KEYS = new Set([...TOGGLE_CONFIG_KEYS, ...TEXT_CONFIG_KEYS]);

function emptySite(): SiteSettings {
  return {
    id: 0,
    lang: "en",
    title: "",
    subtitle: "",
    domain: "",
    logo: "",
    keywords: "",
    description: "",
    icp: "",
    theme: "",
    statistical: "",
    copyright: "",
  };
}

function emptyCompany(): CompanySettings {
  return {
    id: 0,
    lang: "en",
    name: "",
    address: "",
    postcode: "",
    contact: "",
    mobile: "",
    phone: "",
    fax: "",
    email: "",
    qq: "",
    weixin: "",
    blicense: "",
    other: "",
  };
}

function SiteForm() {
  const { client, setStatus, clearStatus } = useSession();
  const { contentLang, t } = useLocale();
  const [form, setForm] = useState<SiteSettings>(() => emptySite());
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const site = await client.fetch<SiteSettings>(`/admin/site?lang=${contentLang}`);
      setForm(site);
      clearStatus();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.settings.failedLoadSite")), "error");
    } finally {
      setLoading(false);
    }
  }, [client, contentLang, clearStatus, setStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setPending(true);
    try {
      await client.fetch<{ status: string }>(`/admin/site?lang=${contentLang}`, {
        method: "PUT",
        body: JSON.stringify({
          lang: contentLang,
          title: form.title.trim(),
          subtitle: form.subtitle,
          domain: form.domain.trim(),
          logo: form.logo.trim(),
          keywords: form.keywords,
          description: form.description,
          icp: form.icp,
          theme: form.theme.trim(),
          statistical: form.statistical,
          copyright: form.copyright,
        }),
      });
      setStatus(t("admin.settings.siteSaved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.settings.failedSaveSite")), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4 rounded-md border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">
          {t("admin.settings.title")}
          <Input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            required
            disabled={loading}
          />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.subtitle")}
          <Input
            value={form.subtitle}
            onChange={(event) => update("subtitle", event.target.value)}
            disabled={loading}
          />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.domain")}
          <Input value={form.domain} onChange={(event) => update("domain", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.logoUrl")}
          <Input value={form.logo} onChange={(event) => update("logo", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.icp")}
          <Input value={form.icp} onChange={(event) => update("icp", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.theme")}
          <Input value={form.theme} onChange={(event) => update("theme", event.target.value)} disabled={loading} />
          <span className="text-xs text-muted-foreground">{t("admin.settings.themeReservedHint")}</span>
        </Label>
      </div>
      <Label className="grid gap-2">
        {t("admin.settings.keywords")}
        <Input value={form.keywords} onChange={(event) => update("keywords", event.target.value)} disabled={loading} />
      </Label>
      <Label className="grid gap-2">
        {t("admin.settings.description")}
        <Textarea
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          rows={3}
          disabled={loading}
        />
      </Label>
      <Label className="grid gap-2">
        {t("admin.settings.statisticalCode")}
        <Textarea
          value={form.statistical}
          onChange={(event) => update("statistical", event.target.value)}
          rows={4}
          disabled={loading}
        />
        <span className="text-xs text-muted-foreground">{t("admin.settings.statisticalReviewHint")}</span>
      </Label>
      <Label className="grid gap-2">
        {t("admin.settings.copyright")}
        <Textarea
          value={form.copyright}
          onChange={(event) => update("copyright", event.target.value)}
          rows={3}
          disabled={loading}
        />
      </Label>
      <div>
        <Button type="submit" disabled={pending || loading}>
          {pending ? t("admin.common.saving") : t("admin.settings.saveSite")}
        </Button>
      </div>
    </form>
  );
}

function CompanyForm() {
  const { client, setStatus, clearStatus } = useSession();
  const { contentLang, t } = useLocale();
  const [form, setForm] = useState<CompanySettings>(() => emptyCompany());
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const company = await client.fetch<CompanySettings>(`/admin/company?lang=${contentLang}`);
      setForm(company);
      clearStatus();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.settings.failedLoadCompany")), "error");
    } finally {
      setLoading(false);
    }
  }, [client, contentLang, clearStatus, setStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setPending(true);
    try {
      await client.fetch<{ status: string }>(`/admin/company?lang=${contentLang}`, {
        method: "PUT",
        body: JSON.stringify({
          lang: contentLang,
          name: form.name.trim(),
          address: form.address,
          postcode: form.postcode,
          contact: form.contact,
          mobile: form.mobile,
          phone: form.phone,
          fax: form.fax,
          email: form.email,
          qq: form.qq,
          weixin: form.weixin,
          blicense: form.blicense,
          other: form.other,
        }),
      });
      setStatus(t("admin.settings.companySaved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.settings.failedSaveCompany")), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4 rounded-md border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">
          {t("admin.settings.name")}
          <Input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            required
            disabled={loading}
          />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.contact")}
          <Input value={form.contact} onChange={(event) => update("contact", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.mobile")}
          <Input value={form.mobile} onChange={(event) => update("mobile", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.phone")}
          <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.email")}
          <Input value={form.email} onChange={(event) => update("email", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.postcode")}
          <Input
            value={form.postcode}
            onChange={(event) => update("postcode", event.target.value)}
            disabled={loading}
          />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.fax")}
          <Input value={form.fax} onChange={(event) => update("fax", event.target.value)} disabled={loading} />
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.qq")}
          <Input value={form.qq} onChange={(event) => update("qq", event.target.value)} disabled={loading} />
          <span className="text-xs text-muted-foreground">{t("admin.settings.displayOnlyHint")}</span>
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.weixin")}
          <Input value={form.weixin} onChange={(event) => update("weixin", event.target.value)} disabled={loading} />
          <span className="text-xs text-muted-foreground">{t("admin.settings.displayOnlyHint")}</span>
        </Label>
        <Label className="grid gap-2">
          {t("admin.settings.businessLicense")}
          <Input
            value={form.blicense}
            onChange={(event) => update("blicense", event.target.value)}
            disabled={loading}
          />
          <span className="text-xs text-muted-foreground">{t("admin.settings.displayOnlyHint")}</span>
        </Label>
      </div>
      <Label className="grid gap-2">
        {t("admin.settings.address")}
        <Textarea
          value={form.address}
          onChange={(event) => update("address", event.target.value)}
          rows={3}
          disabled={loading}
        />
      </Label>
      <Label className="grid gap-2">
        {t("admin.settings.other")}
        <Textarea
          value={form.other}
          onChange={(event) => update("other", event.target.value)}
          rows={4}
          disabled={loading}
        />
        <span className="text-xs text-muted-foreground">{t("admin.settings.displayOnlyHint")}</span>
      </Label>
      <div>
        <Button type="submit" disabled={pending || loading}>
          {pending ? t("admin.common.saving") : t("admin.settings.saveCompany")}
        </Button>
      </div>
    </form>
  );
}

function ConfigPanel() {
  const { client, setStatus, clearStatus } = useSession();
  const { t } = useLocale();
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await client.fetch<ConfigResponse>("/admin/config");
      setItems(result.items);
      setValues(Object.fromEntries(result.items.map((item) => [item.name, item.value || ""])));
      clearStatus();
    } catch (err) {
      setItems([]);
      setError(errorMessage(err, t("admin.settings.failedLoadConfig")));
      setStatus(errorMessage(err, t("admin.settings.failedLoadConfig")), "error");
    } finally {
      setLoading(false);
    }
  }, [client, clearStatus, setStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setPending(true);
    try {
      const activeValues = Object.fromEntries(Object.entries(values).filter(([name]) => ACTIVE_CONFIG_KEYS.has(name)));
      await client.fetch<{ status: string }>("/admin/config", {
        method: "PUT",
        body: JSON.stringify({ values: activeValues }),
      });
      setStatus(t("admin.settings.configSaved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.settings.failedSaveConfig")), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t("admin.settings.configCompatibilityHint")}
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>{t("admin.settings.configName")}</TableHead>
              <TableHead>{t("admin.settings.configValue")}</TableHead>
              <TableHead>{t("admin.settings.configRuntime")}</TableHead>
              <TableHead>{t("admin.settings.configDesc")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  {t("admin.common.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  {t("admin.settings.noConfig")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const active = ACTIVE_CONFIG_KEYS.has(item.name);
                const toggle = TOGGLE_CONFIG_KEYS.has(item.name);
                return (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {toggle ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={(values[item.name] ?? "") === "1"}
                            onCheckedChange={(checked) =>
                              setValues((prev) => ({ ...prev, [item.name]: checked ? "1" : "0" }))
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {(values[item.name] ?? "") === "1" ? t("admin.common.enabled") : t("admin.common.disabled")}
                          </span>
                        </div>
                      ) : active ? (
                        <Input
                          value={values[item.name] ?? ""}
                          type={item.name === "ai_admin_token" ? "password" : "text"}
                          placeholder={
                            item.name === "ai_admin_token" ? t("admin.settings.aiTokenPlaceholder") : "admin"
                          }
                          onChange={(event) => setValues((prev) => ({ ...prev, [item.name]: event.target.value }))}
                        />
                      ) : (
                        <Input
                          value={values[item.name] ?? ""}
                          disabled
                          title={t("admin.settings.configLegacyTitle")}
                          onChange={(event) => setValues((prev) => ({ ...prev, [item.name]: event.target.value }))}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={active ? "success" : "muted"}>
                        {active ? t("admin.settings.configActive") : t("admin.settings.configLegacy")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.description || item.type || "-"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{t("admin.settings.sensitiveHint")}</span>
        <Button type="button" disabled={pending || loading} onClick={() => void save()}>
          {pending ? t("admin.common.saving") : t("admin.settings.saveConfig")}
        </Button>
      </div>
    </div>
  );
}

function LabelsPanel() {
  const { client, setStatus, clearStatus } = useSession();
  const { t } = useLocale();
  const [items, setItems] = useState<LabelItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingName, setSavingName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await client.fetch<LabelItem[]>("/admin/labels");
      setItems(result);
      setValues(Object.fromEntries(result.map((item) => [item.name, item.value || ""])));
      clearStatus();
    } catch (err) {
      setItems([]);
      setError(errorMessage(err, t("admin.settings.failedLoadLabels")));
      setStatus(errorMessage(err, t("admin.settings.failedLoadLabels")), "error");
    } finally {
      setLoading(false);
    }
  }, [client, clearStatus, setStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveLabel(name: string) {
    setSavingName(name);
    try {
      await client.fetch<{ status: string }>(`/admin/labels/${encodeURIComponent(name)}`, {
        method: "PUT",
        body: JSON.stringify({ value: values[name] ?? "" }),
      });
      setStatus(t("admin.settings.labelSaved"));
      void load();
    } catch (err) {
      setStatus(errorMessage(err, t("admin.settings.failedSaveLabel")), "error");
    } finally {
      setSavingName("");
    }
  }

  const keyword = search.trim().toLowerCase();
  const visible = keyword
    ? items.filter((item) => `${item.name} ${item.value} ${item.description}`.toLowerCase().includes(keyword))
    : items;

  return (
    <div className="grid gap-4">
      <Input
        className="max-w-xs"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("admin.common.searchLabels")}
      />
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>{t("admin.settings.labelName")}</TableHead>
              <TableHead>{t("admin.settings.labelValue")}</TableHead>
              <TableHead>{t("admin.settings.labelDesc")}</TableHead>
              <TableHead>{t("admin.settings.labelAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  {t("admin.common.loading")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  {t("admin.settings.noLabels")}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Input
                      value={values[item.name] ?? ""}
                      onChange={(event) => setValues((prev) => ({ ...prev, [item.name]: event.target.value }))}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.description || item.type || "-"}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={savingName === item.name}
                      onClick={() => void saveLabel(item.name)}
                    >
                      {savingName === item.name ? t("admin.common.saving") : t("admin.settings.saveLabel")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UploadPanel() {
  const { client, setStatus } = useSession();
  const { t } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(kind: "file" | "image") {
    if (!file) {
      setStatus(t("admin.settings.chooseFile"), "error");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const endpoint = kind === "image" ? "/admin/upload/image" : "/admin/upload/file";
      const result = await client.fetch<UploadResult>(endpoint, { method: "POST", body: data });
      setResultUrl(result.url);
      setStatus(kind === "image" ? t("admin.settings.imageUploaded") : t("admin.settings.fileUploaded"));
    } catch (err) {
      setStatus(errorMessage(err, t("admin.settings.failedUpload")), "error");
    } finally {
      setUploading(false);
    }
  }

  async function copyUrl() {
    if (!resultUrl) {
      setStatus(t("admin.settings.noUrl"), "error");
      return;
    }
    try {
      await copyTextToClipboard(resultUrl);
      setStatus(t("admin.settings.urlCopied"));
    } catch {
      setStatus(t("admin.settings.failedCopy"), "error");
    }
  }

  return (
    <div className="grid max-w-3xl gap-4 rounded-md border bg-card p-4">
      <Label className="grid gap-2">
        {t("admin.settings.uploadFile")}
        <div className="flex flex-wrap items-center gap-2">
          <Input type="file" className="flex-1" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" disabled={uploading} onClick={() => void upload("file")}>
            <Upload aria-hidden="true" size={16} />
            {t("admin.settings.uploadFile")}
          </Button>
          <Button type="button" variant="outline" disabled={uploading} onClick={() => void upload("image")}>
            <Upload aria-hidden="true" size={16} />
            {t("admin.settings.uploadImage")}
          </Button>
        </div>
      </Label>
      <Label className="grid gap-2">
        {t("admin.settings.resultUrl")}
        <div className="flex flex-wrap items-center gap-2">
          <Input className="flex-1" value={resultUrl} readOnly />
          <Button type="button" variant="outline" onClick={() => void copyUrl()}>
            <Copy aria-hidden="true" size={16} />
            {t("admin.common.copyUrl")}
          </Button>
        </div>
      </Label>
    </div>
  );
}

export default function SettingsView() {
  const { t } = useLocale();
  const [tab, setTab] = useState<SettingsTab>("site");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((value) => value + 1);

  const panels = useMemo<Record<SettingsTab, ReactNode>>(
    () => ({
      site: <SiteForm key={`site-${refreshKey}`} />,
      company: <CompanyForm key={`company-${refreshKey}`} />,
      config: <ConfigPanel key={`config-${refreshKey}`} />,
      labels: <LabelsPanel key={`labels-${refreshKey}`} />,
      upload: <UploadPanel key={`upload-${refreshKey}`} />,
    }),
    [refreshKey]
  );

  const TABS: { value: SettingsTab; label: string }[] = [
    { value: "site", label: t("admin.settings.site") },
    { value: "company", label: t("admin.settings.company") },
    { value: "config", label: t("admin.settings.config") },
    { value: "labels", label: t("admin.settings.labels") },
    { value: "upload", label: t("admin.settings.upload") },
  ];

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Settings aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("admin.nav.settings")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.settings.workspaceDesc")}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={refresh}>
          <RefreshCw aria-hidden="true" size={16} />
          {t("admin.common.refresh")}
        </Button>
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTab)}>
        <div className="rounded-md border bg-card p-3">
          <TabsList>
            {TABS.map((entry) => (
              <TabsTrigger key={entry.value} value={entry.value}>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map((entry) => (
          <TabsContent key={entry.value} value={entry.value}>
            {panels[entry.value]}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
