export type UpdateProduct = "engine" | "gui";

export interface UpdateInfo {
  product: UpdateProduct;
  current_version: string | null;
  latest_version: string;
  release_url: string;
  published_at: string;
  update_available: boolean;
  no_releases: boolean;
}
