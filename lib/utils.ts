export const HOSTING_CONFIG_KEY = "roominate_hosting_config";
export const HOSTING_DOMAIN_SUFFIX = ".puter.site";

/**
 * Type guard to check if a value is a hosted URL on Puter.
 * @param {unknown} value - Value to check.
 * @returns {boolean} True if the value is a string containing the Puter hosting domain suffix.
 */
export const isHostedUrl = (value: unknown): value is string =>
    typeof value === "string" && value.includes(HOSTING_DOMAIN_SUFFIX);

/**
 * Generates a unique slug for Puter hosting subdomain.
 * @returns {string} Unique subdomain slug combining timestamp and random characters.
 */
export const createHostingSlug = () =>
    `roominate-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

/**
 * Normalizes a subdomain to include the Puter hosting domain suffix if not already present.
 * @param {string} subdomain - Subdomain to normalize.
 * @returns {string} Normalized subdomain with domain suffix.
 */
const normalizeHost = (subdomain: string) =>
    subdomain.endsWith(HOSTING_DOMAIN_SUFFIX)
        ? subdomain
        : `${subdomain}${HOSTING_DOMAIN_SUFFIX}`;

/**
 * Constructs a full hosted URL from subdomain and file path.
 * @param {Object} hosting - Hosting configuration.
 * @param {string} hosting.subdomain - Puter hosting subdomain.
 * @param {string} filePath - Path to the file relative to hosting root.
 * @returns {string|null} Full HTTPS URL to the hosted file, or null if subdomain is missing.
 */
export const getHostedUrl = (
    hosting: { subdomain: string },
    filePath: string,
): string | null => {
    if (!hosting?.subdomain) return null;
    const host = normalizeHost(hosting.subdomain);
    return `https://${host}/${filePath}`;
};

/**
 * Determines the appropriate file extension for an image based on content type or URL.
 * @param {string} contentType - MIME content type of the image.
 * @param {string} url - Image URL or data URL.
 * @returns {string} Image file extension (e.g., 'png', 'jpg', 'webp'), defaults to 'png'.
 */
export const getImageExtension = (contentType: string, url: string): string => {
    const type = (contentType || "").toLowerCase();
    const typeMatch = type.match(/image\/(png|jpe?g|webp|gif|svg\+xml|svg)/);
    if (typeMatch?.[1]) {
        const ext = typeMatch[1].toLowerCase();
        return ext === "jpeg" || ext === "jpg"
            ? "jpg"
            : ext === "svg+xml"
                ? "svg"
                : ext;
    }

    const dataMatch = url.match(/^data:image\/([a-z0-9+.-]+);/i);
    if (dataMatch?.[1]) {
        const ext = dataMatch[1].toLowerCase();
        return ext === "jpeg" ? "jpg" : ext;
    }

    const extMatch = url.match(/\.([a-z0-9]+)(?:$|[?#])/i);
    if (extMatch?.[1]) return extMatch[1].toLowerCase();

    return "png";
};

/**
 * Converts a data URL to a Blob object.
 * @param {string} dataUrl - Base64 or URL-encoded data URL.
 * @returns {Object|null} Object with blob and contentType properties, or null on parse failure.
 */
export const dataUrlToBlob = (
    dataUrl: string,
): { blob: Blob; contentType: string } | null => {
    try {
        const match = dataUrl.match(/^data:([^;]+)?(;base64)?,([\s\S]*)$/i);
        if (!match) return null;
        const contentType = match[1] || "";
        const isBase64 = !!match[2];
        const data = match[3] || "";
        const raw = isBase64
            ? atob(data.replace(/\s/g, ""))
            : decodeURIComponent(data);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i += 1) {
            bytes[i] = raw.charCodeAt(i);
        }
        return { blob: new Blob([bytes], { type: contentType }), contentType };
    } catch {
        return null;
    }
};

/**
 * Fetches a blob from a URL or converts a data URL to blob.
 * @param {string} url - HTTP URL or data URL of the image.
 * @returns {Promise<Object|null>} Object with blob and contentType properties, or null on failure.
 */
export const fetchBlobFromUrl = async (
    url: string,
): Promise<{ blob: Blob; contentType: string } | null> => {
    if (url.startsWith("data:")) {
        return dataUrlToBlob(url);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch image");
        return {
            blob: await response.blob(),
            contentType: response.headers.get("content-type") || "",
        };
    } catch {
        return null;
    }
};

/**
 * Converts an image URL to a PNG blob by rendering it on a canvas.
 * @param {string} url - URL of the image to convert.
 * @returns {Promise<Blob|null>} PNG blob of the image, or null on failure or in non-browser environment.
 */
export const imageUrlToPngBlob = async (url: string): Promise<Blob | null> => {
    if (typeof window === "undefined") return null;

    try {
        const img = new Image();
        img.crossOrigin = "anonymous";

        const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = url;
        });

        const width = loaded.naturalWidth || loaded.width;
        const height = loaded.naturalHeight || loaded.height;
        if (!width || !height) return null;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(loaded, 0, 0, width, height);

        return await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((result) => resolve(result), "image/png");
        });
    } catch {
        return null;
    }
};