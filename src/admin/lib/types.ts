// Shared admin domain types, ported from the legacy index.astro controller.
// Single source of truth for the React admin app's data shapes.

export type Envelope<T> = {
  code: number;
  message: string;
  data?: T;
  details?: unknown;
};

export type Role = {
  code: string;
  name: string;
};

export type User = {
  id: number;
  ucode: string;
  username: string;
  realName: string;
  roles: Role[];
};

export type LoginData = {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: User;
};

export type Message = {
  id: number;
  lang: string;
  contacts: string;
  mobile: string;
  content: string;
  userIp: string;
  userOs: string;
  userBs: string;
  reply: string;
  status: string;
  createTime: string;
  updateTime: string;
};

export type FormSubmission = {
  id: number;
  formCode: string;
  lang: string;
  data: Record<string, unknown>;
  submitterIp: string;
  createdAt: string;
};

export type Slide = {
  id: number;
  lang: string;
  gid: number;
  pic: string;
  link: string;
  title: string;
  subtitle: string;
  sorting: number;
};

export type FriendLink = {
  id: number;
  lang: string;
  gid: number;
  name: string;
  link: string;
  logo: string;
  sorting: number;
};

export type AdminFormField = {
  id: number;
  fieldKey: string;
  label: string;
  maxLength: number;
  required: string;
  sortOrder: number;
};

export type AdminFormDefinition = {
  id: number;
  code: string;
  name: string;
  enabled: string;
  fields: AdminFormField[];
};

export type CategoryModel = {
  code: string;
  name: string;
  type: string;
  urlName: string;
  listTpl: string;
  contentTpl: string;
  status: string;
};

export type Category = {
  id?: number;
  lang?: string;
  parentCode?: string;
  code: string;
  name: string;
  subname?: string;
  modelCode: string;
  model?: CategoryModel;
  listTpl?: string;
  contentTpl?: string;
  status: string;
  outlink?: string;
  icon?: string;
  pic?: string;
  title?: string;
  keywords?: string;
  description?: string;
  filename?: string;
  sorting?: number;
  children?: Category[];
};

export type ContentItem = {
  id: number;
  lang: string;
  scode: string;
  category: {
    code: string;
    name: string;
    modelCode: string;
    modelName: string;
  };
  title: string;
  subtitle: string;
  filename: string;
  date: string;
  description: string;
  status: string;
  isTop: string;
  isRecommend: string;
  isHeadline: string;
  sorting: number;
  visits: number;
  likes: number;
};

export type ContentDetail = ContentItem & {
  subscode: string;
  titleColor: string;
  author: string;
  source: string;
  outlink: string;
  icon: string;
  pics: string;
  picsTitle: string;
  content: string;
  tags: string;
  enclosure: string;
  keywords: string;
  doc?: object;
};

export type UploadResult = {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
};

export type CreateResponse = {
  id: number;
};

export type ConfigItem = {
  id: number;
  name: string;
  value: string;
  type: string;
  sorting: number;
  description: string;
};

export type ConfigResponse = {
  items: ConfigItem[];
  map: Record<string, string>;
};

export type LabelItem = {
  id: number;
  name: string;
  value: string;
  type: string;
  description: string;
};

export type SiteSettings = {
  id: number;
  lang: string;
  title: string;
  subtitle: string;
  domain: string;
  logo: string;
  keywords: string;
  description: string;
  icp: string;
  theme: string;
  statistical: string;
  copyright: string;
};

export type CompanySettings = {
  id: number;
  lang: string;
  name: string;
  address: string;
  postcode: string;
  contact: string;
  mobile: string;
  phone: string;
  fax: string;
  email: string;
  qq: string;
  weixin: string;
  blicense: string;
  other: string;
};

export type LogEntry = {
  id: number;
  level: string;
  event: string;
  userIp: string;
  userOs: string;
  userBrowser: string;
  createUser: string;
  createTime: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

// R2 media library. Mirrors internal/upload/storage.go ObjectInfo/ListResult/
// BatchDeleteResult. Listing is cursor-paginated (ListObjectsV2 has no total),
// so the contract is nextCursor/hasMore — not page/total like PageResult.
export type MediaObject = {
  key: string;
  name: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag?: string;
  url: string;
  isImage: boolean;
};

export type MediaListResult = {
  items: MediaObject[];
  nextCursor?: string;
  hasMore: boolean;
};

export type BatchDeleteError = {
  key: string;
  message: string;
};

export type BatchDeleteResult = {
  deleted: string[];
  errors: BatchDeleteError[];
};

export type AdminUser = {
  id: number;
  ucode: string;
  username: string;
  realName: string;
  status: string;
  roles: Role[];
};

export type AdminRole = Role & {
  description: string;
  permissionCodes: string[];
  langs: string[];
};

export type PermissionItem = {
  code: string;
  description: string;
};

export type LanguageItem = {
  code: string;
  name: string;
};

export type RBACSnapshot = {
  users: AdminUser[];
  roles: AdminRole[];
  permissions: PermissionItem[];
  languages: LanguageItem[];
};

export type ViewName =
  | "dashboard"
  | "messages"
  | "forms"
  | "contents"
  | "categories"
  | "resources"
  | "rbac"
  | "settings"
  | "logs"
  | "media";
