import puter from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

/**
 * Initiates the Puter authentication sign-in flow.
 * @returns {Promise<void>} Promise that resolves when sign-in is complete.
 */
export const signIn = async () => await puter.auth.signIn();

/**
 * Signs out the current user from Puter authentication.
 * @returns {Promise<void>} Promise that resolves when sign-out is complete.
 */
export const signOut = async () => puter.auth.signOut();

/**
 * Retrieves the currently authenticated user from Puter.
 * @returns {Promise<Object|null>} User object if authenticated, null if not authenticated or on error.
 */
export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch  {
    return null;
  }
}

/**
 * Creates or updates a project by uploading images to hosting and saving metadata via Puter worker.
 * @param {CreateProjectParams} params - Project creation parameters.
 * @param {DesignItem} params.item - Design item containing project data and images.
 * @param {string} params.visibility - Project visibility setting (default: 'private').
 * @returns {Promise<DesignItem|null|undefined>} Saved project data or null if save failed.
 */
export const createProject = async ({ item, visibility = 'private' }: CreateProjectParams): Promise<DesignItem | null | undefined> => {
  if(!PUTER_WORKER_URL) {
    console.warn('Missing VITE_PUTER_WORKER_URL: skip history fetch;');
    return null;
  }
  const projectId = item.id;

  const hosting = await getOrCreateHostingConfig();

  const hostedSource = projectId ?
    await uploadImageToHosting({ hosting, url: item.sourceImage, projectId, label: 'source', }) : null;

  const hostedRender = projectId && item.renderedImage ?
    await uploadImageToHosting({ hosting, url: item.renderedImage, projectId, label: 'rendered', }) : null;

  const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage)
      ? item.sourceImage
      : ''
  );

  if(!resolvedSource) {
    console.warn('Failed to host source image, skipping save.');
    return null;
  }

  const resolvedRender = hostedRender?.url
    ? hostedRender?.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  const payload = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  }

  try {
     const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
      method: 'POST',
      body: JSON.stringify({
        project: payload,
        visibility
      }),
    });

    if(!response.ok) {
      console.error('failed to save the project', await response.text());
      return null;
    }

    const data = (await response.json()) as { project: DesignItem | null }

    return data?.project ?? null;
  } catch (e) {
    console.log('Failed to save project', e);
    return null;
  }
}

/**
 * Retrieves all projects for the authenticated user from Puter worker.
 * @returns {Promise<DesignItem[]>} Array of design items representing user projects, or empty array on error.
 */
export const getProjects = async ()=> {
  if(!PUTER_WORKER_URL) {
    console.warn('Missing VITE_PUTER_WORKER_URL; skip history fetch;');
    return [];
  }

  try {
    const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

    if(!response.ok) {
      console.error('Failed to fetch history', await response.text());
      return [];
    }

    const data = (await response.json()) as { projects: DesignItem[] | null };

    return Array.isArray(data?.projects) ? data?.projects : [];
  } catch (e) {
    console.error('Failed to get projects', e);
    return [];
  }
}

/**
 * Retrieves a specific project by its ID from Puter worker.
 * @param {Object} params - Function parameters.
 * @param {string} params.id - Unique identifier of the project to retrieve.
 * @returns {Promise<DesignItem|null>} Project data if found, null if not found or on error.
 */
export const getProjectById = async ({ id }: { id: string }) => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
        return null;
    }

    console.log("Fetching project with ID:", id);

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        console.log("Fetch project response:", response);

        if (!response.ok) {
            console.error("Failed to fetch project:", await response.text());
            return null;
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };

        console.log("Fetched project data:", data);

        return data?.project ?? null;
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return null;
    }
};