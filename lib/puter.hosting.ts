import puter from "@heyputer/puter.js";
import { createHostingSlug, 
  fetchBlobFromUrl, 
  getHostedUrl, 
  getImageExtension, 
  HOSTING_CONFIG_KEY, 
  imageUrlToPngBlob, 
  isHostedUrl 
} from "./utils";

/**
 * Retrieves existing hosting configuration or creates a new Puter hosting subdomain.
 * @returns {Promise<HostingConfig|null>} Hosting configuration with subdomain, or null on error.
 */
export const getOrCreateHostingConfig = async (): Promise<HostingConfig | null> => {
  const existing = (await puter.kv.get(HOSTING_CONFIG_KEY)) as HostingConfig | null;

  if(existing?.subdomain) return { subdomain: existing.subdomain };

  const subdomain = createHostingSlug();

  try {
    const created = await puter.hosting.create(subdomain, '.');

    const record = { subdomain: created.subdomain };

    await puter.kv.set(HOSTING_CONFIG_KEY, record);

    return record;
  } catch (e) {
    console.warn(`Could not find subdomain: ${e}`);
    return null;
  }
}

/**
 * Uploads an image to Puter hosting and returns the hosted URL.
 * @param {StoreHostedImageParams} params - Upload parameters.
 * @param {HostingConfig} params.hosting - Hosting configuration with subdomain.
 * @param {string} params.url - Source URL or data URL of the image to upload.
 * @param {string} params.projectId - Project identifier for organizing files.
 * @param {string} params.label - Label for the image file (e.g., 'source', 'rendered').
 * @returns {Promise<HostedAsset|null>} Object with hosted URL if successful, null on error.
 */
export const uploadImageToHosting = async ({ hosting, url, projectId, label }: StoreHostedImageParams): Promise<HostedAsset | null> => {
  if(!hosting || !url) return null;
  if(isHostedUrl(url)) return { url };

  try {
    const resolved = label === "rendered"
      ? await imageUrlToPngBlob(url)
        .then((blob)=> blob ? { blob, contentType: 'image/png' }:  null)
      : await fetchBlobFromUrl(url)

    if(!resolved) return null;

    const contentType = resolved.contentType || resolved.blob.type || '';
    const ext = getImageExtension(contentType, url);
    const dir = `projects/${projectId}`;
    const filePath = `${dir}/${label}.${ext}`;

    const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
      type: contentType,
    });

    await puter.fs.mkdir(dir, { createMissingParents: true });
    await puter.fs.write(filePath, uploadFile);

    const hostedUrl = getHostedUrl({ subdomain: hosting.subdomain }, filePath);

    return hostedUrl ? { url: hostedUrl } : null;
  } catch (e) {
    console.warn(`Failed to store hosted image: ${e}`);
    return null;
  }
}