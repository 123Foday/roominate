const PROJECT_PREFIX = 'roominate_project_';

/**
 * Creates a JSON error response with CORS headers.
 * @param {number} status - HTTP status code for the error response.
 * @param {string} message - Error message to return in the response.
 * @param {Object} extra - Additional properties to include in the error response.
 * @returns {Response} JSON response with error details and CORS headers.
 */
const jsonError = (status, message, extra = {}) => {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

/**
 * Retrieves the user ID from the Puter authentication system.
 * @param {Object} userPuter - Puter instance for the authenticated user.
 * @returns {Promise<string|null>} User UUID if authenticated, null otherwise.
 */
const getUserId = async (userPuter)=> {
  try {
    const user = await userPuter.auth.getUser();

    return user?.uuid || null;
  } catch (e) {
    return null;
  }
};

/**
 * API endpoint to save a project to Puter key-value storage.
 * @param {Object} params - Request parameters.
 * @param {Request} params.request - HTTP request object containing project data.
 * @param {Object} params.user - Authenticated user object with Puter instance.
 * @returns {Promise<Object|Response>} Success response with saved project or error response.
 */
router.post('/api/projects/save', async ({ request, user })=> {
  try {
    const userPuter = user.puter;

    if(!userPuter) return jsonError(401, 'Authentication failed');

    const body = await request.json();
    const project = body?.project;

    if(!project?.id || !project?.sourceImage) return jsonError(400, 'Project ID and source image are both required');

    const payload = {
      ...project,
      updatedAt: new Date().toISOString(),
    }

    const userId = await getUserId(userPuter);
    if(!userId) return jsonError(401, 'Authentication failed');

    const key = `${PROJECT_PREFIX}${project.id}`;
    await userPuter.kv.set(key, payload);

    return { saved: true, id: project.id, project: payload};
  } catch (e) {
    return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error'});
  }
});

/**
 * API endpoint to list all projects for the authenticated user.
 * @param {Object} params - Request parameters.
 * @param {Object} params.user - Authenticated user object with Puter instance.
 * @returns {Promise<Object|Response>} Object containing array of projects or error response.
 */
router.get('/api/projects/list', async ({ user }) => {
  try {
    const userPuter = user?.puter;
    if (!userPuter) return jsonError(401, 'Authentication failed');

    const userId = await getUserId(userPuter);
    if(!userId) return jsonError(401, 'Authentication failed');

    const projects = (await userPuter.kv.list(PROJECT_PREFIX, true))
      .map(({value})=> ({ ...value, isPublic: true}));

    return { projects };
  } catch (e) {
    return jsonError(500, 'Failed to list projects', { message: e?.message || 'Unknown error' });
  }
});

/**
 * API endpoint to retrieve a specific project by ID.
 * @param {Object} params - Request parameters.
 * @param {Request} params.request - HTTP request object with project ID in query params.
 * @param {Object} params.user - Authenticated user object with Puter instance.
 * @returns {Promise<Object|Response>} Object containing project data or error response.
 */
router.get('/api/projects/get', async ({ request, user }) => {
  try {
    const userPuter = user?.puter;
    if (!userPuter) return jsonError(401, 'Authentication failed');

    const userId = await getUserId(userPuter);
    if(!userId) return jsonError(401, 'Authentication failed');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return jsonError(400, 'Project ID is required');

    const key = `${PROJECT_PREFIX}${id}`
    const project = await userPuter.kv.get(key);

    if (!project ) return jsonError(404, 'Project not found');

    return { project };
  } catch (e) {
    return jsonError(500, 'Failed to fetch project', { message: e?.message || 'Unknown error' });
  }
});