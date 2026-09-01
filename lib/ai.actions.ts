import puter from "@heyputer/puter.js";
import { ROOMINATE_RENDER_PROMPT } from "./constants";

/**
 * Fetches an image from a URL and converts it to a base64 data URL.
 * @param {string} url - URL of the image to fetch.
 * @returns {Promise<string>} Base64-encoded data URL of the image.
 * @throws {Error} If the fetch fails.
 */
export const fetchAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);

  if(!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject)=> {
    const reader = new FileReader();
    reader.onloadend = ()=> resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Generates a 3D floor plan visualization from a source image using AI.
 * @param {Generate3DViewParams} params - Generation parameters.
 * @param {string} params.sourceImage - Source floor plan image URL or data URL.
 * @returns {Promise<Object>} Object containing renderedImage (data URL) and renderedPath (undefined).
 * @throws {Error} If the source image payload is invalid.
 */
export const generate3DView = async ({ sourceImage }: Generate3DViewParams)=> {
  const dataUrl = sourceImage.startsWith('data:')
    ? sourceImage
    : await fetchAsDataUrl(sourceImage);

  const base64Data = dataUrl.split(',')[1];
  const mimeType = dataUrl.split(';')[0].split(':')[1];

  if(!mimeType || !base64Data) throw new Error('Invalid souce image payload');

  const response = await puter.ai.txt2img(ROOMINATE_RENDER_PROMPT, {
    provider: 'gemini',
    model: 'gemini-2.5-flash-image-preview',
    input_image: base64Data,
    input_image_mime_type: mimeType,
    ratio: {w: 1024, h: 1024 }
  });

  const rawImageUrl = (response as HTMLImageElement).src ?? null;

  if(!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

  const renderedImage = rawImageUrl.startsWith('data:')
  ? rawImageUrl : await fetchAsDataUrl(rawImageUrl);

  return { renderedImage, renderedPath: undefined };
}