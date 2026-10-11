# Roominate

Roominate is an AI-assisted architectural visualization tool. Upload a 2D floor plan and Roominate generates a photorealistic, top-down 3D render while preserving the plan's rooms, walls, doors, windows, and visible fixtures. Each project can be opened in a visualizer with a before-and-after comparison and exported as a PNG image.

## Features

- Puter authentication with sign-in and sign-out controls.
- Floor-plan upload through click-to-upload or drag and drop.
- JPG, JPEG, PNG, and WebP input support.
- AI rendering through Puter's `txt2img` API using Gemini.
- Automatic image hosting on a Puter `.puter.site` subdomain.
- Project persistence and history through a Puter Worker API.
- Before-and-after comparison using `react-compare-slider`.
- PNG export of the generated render.
- React Router server-side rendering and Vite hot module replacement.
- TypeScript and Tailwind CSS.

## How It Works

1. A user signs in with Puter.
2. The user uploads a floor-plan image from the home page.
3. Roominate reads the image locally as a data URL and creates a project ID.
4. The source image is uploaded to Puter hosting and project metadata is saved through the worker.
5. The visualizer loads the project and sends the source image to the AI generation action.
6. The generated image is converted to a data URL when necessary, uploaded to Puter hosting, and saved back to the project.
7. The visualizer displays the render, comparison slider, and export controls.

The AI prompt requires an orthographic top-down render, exact floor-plan geometry, no text or watermarks, and realistic materials and lighting. Furniture is added only when a corresponding fixture or icon is clearly present in the source plan.

## Application Routes

| Route | Purpose |
| --- | --- |
| `/` | Upload a floor plan and browse saved projects. |
| `/visualizer/:id` | Load a project, generate its render, compare images, and export the result. |

## Project Structure

```text
app/
	root.tsx                 Root layout, authentication state, and error boundary
	routes.ts                React Router route configuration
	routes/home.tsx          Upload workflow and project gallery
	routes/visualizer.$id.tsx Project visualizer and export workflow
	app.css                  Application styles and Tailwind utilities
components/
	Navbar.tsx               Branding and Puter authentication controls
	Upload.tsx               Image upload and progress UI
	ui/Button.tsx            Shared button component
lib/
	ai.actions.ts            Image preparation and Gemini rendering action
	constants.ts             Environment values, prompt, and UI constants
	puter.action.ts          Authentication and project API actions
	puter.hosting.ts         Puter hosting and image upload helpers
	puter.worker.js          Worker endpoints for project persistence
	utils.ts                 Image and hosting utilities
public/                    Public static assets
build/                     Generated production output; do not edit manually
```

## Requirements

- Node.js 24 or newer. The Docker image uses `node:24-alpine`.
- npm.
- A Puter account for authentication, AI generation, hosting, and storage.
- A deployed Puter Worker exposing the project endpoints used by the app.

## Configuration

Create a `.env` file in the project root:

```dotenv
VITE_PUTER_WORKER_URL=https://your-worker-url
```

`VITE_PUTER_WORKER_URL` is required for project history and persistence. The client calls these worker endpoints:

- `POST /api/projects/save`
- `GET /api/projects/list`
- `GET /api/projects/get?id=<project-id>`

The worker authenticates requests through the Puter user context and stores project records in the user's Puter key-value storage. The worker source is [lib/puter.worker.js](lib/puter.worker.js); deploy it according to the Puter Worker deployment process before testing saved projects.

Without the worker URL, the app can still load, but project listing, project retrieval, and project saving are skipped. Uploading also requires the user to be signed in.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server with hot module replacement:

```bash
npm run dev
```

Open `http://localhost:5173` in a browser, sign in with Puter, and upload an image.

Run the TypeScript and React Router checks:

```bash
npm run typecheck
```

Create a production build:

```bash
npm run build
```

Run the production server from the generated build:

```bash
npm run start
```

The production server serves the output generated in `build/client` and `build/server`.

## Docker

Build the image:

```bash
docker build -t roominate .
```

Run it on port 3000:

```bash
docker run --env-file .env -p 3000:3000 roominate
```

The Dockerfile installs development dependencies for the build stage, installs production dependencies in a separate stage, builds the React Router application, and runs the generated server with `npm run start`.

## Data and Storage

Project records contain an ID, name, source image URL, optional rendered image URL, timestamp, owner information, and visibility metadata. Images begin as browser data URLs. Before a project is saved, Roominate uploads them to Puter hosting under paths similar to:

```text
projects/<project-id>/source.<extension>
projects/<project-id>/rendered.png
```

The hosting subdomain is created once per user and cached in Puter key-value storage under `roominate_hosting_config`.

## Troubleshooting

### Projects do not appear in history

Confirm that `VITE_PUTER_WORKER_URL` is set, the worker is deployed, and the browser user is signed in. Check the browser console for worker response or authentication errors.

### Upload is unavailable

The upload input is disabled until Puter authentication succeeds. Sign in from the navigation bar and try again.

### Rendering fails

Confirm that the Puter account can access the AI image-generation API and that the uploaded file is a supported image format. The generation action also needs to be able to fetch hosted source images.

### Export is disabled

Export becomes available after the visualizer has a generated render. Wait for the rendering state to finish and confirm that the render image is visible.

## Technology Stack

- React 19
- React Router 8
- TypeScript 5
- Vite 8
- Tailwind CSS 4
- Puter.js
- Gemini image generation through Puter
- Lucide React
- React Compare Slider

## License

No license file is currently included in this repository. Add one before distributing Roominate publicly.
