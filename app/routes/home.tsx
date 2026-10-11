import { ArrowRight, ArrowUpRight, Clock, Layers, Trash2 } from "lucide-react";
import Navbar from "../../components/Navbar";
import type { Route } from "./+types/home";
import Button from "../../components/ui/Button";
import Upload from "../../components/Upload";
import { useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { createProject, getProjects, deleteProject } from "../../lib/puter.action";

/**
 * Generates meta tags for the home page.
 * @param {Route.MetaArgs} params - Route meta arguments.
 * @returns {Array} Array of meta tag objects.
 */
export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

/**
 * Home page component displaying hero section, upload area, and project gallery.
 * @returns {JSX.Element} Home page layout.
 */
export default function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DesignItem[]>([]);
  const isCreatingProjectRef = useRef(false);

  /**
   * Handles file upload completion by creating a new project and navigating to visualizer.
   * @param {string} base64Image - Base64-encoded uploaded image.
   * @returns {Promise<boolean>} True if project creation succeeded, false otherwise.
   */
  const handleUploadComplete = async (base64Image: string) => {
    try {
      if (isCreatingProjectRef.current) return false;
      isCreatingProjectRef.current = true;
      const newId = Date.now().toString();
      const name = `Residence ${newId}`;

      const newItem = {
        id: newId, name, sourceImage: base64Image,
        renderedImage: undefined,
        timestamp: Date.now()
      }

      const saved = await createProject({ item: newItem, visibility: 'private' });

      if (!saved) {
        console.error('Failed to create project');
        return false;
      }

      setProjects((prev) => [saved, ...prev]);

      navigate(`/visualizer/${newId}`, {
        state: {
          initialImage: saved.sourceImage,
          initialRender: saved.renderedImage || null,
          name
        }
      });

      return true;
    } finally {
      isCreatingProjectRef.current = false;
    }
  }

  /**
   * Handles deleting a project from the user's collection.
   * @param {string} id - The ID of the project to delete.
   * @returns {Promise<void>}
   */
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        const success = await deleteProject({ id });
        if (success) {
          setProjects(prev => prev.filter(project => project.id !== id));
        } else {
          alert('Failed to delete project');
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete project');
      }
    }
  }

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      const items = await getProjects();

      if (!isMounted) return;
      setProjects(items);
    };

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home">
      <Navbar />

      <section className="hero">
        <div className="announce">
          <div className="dot">
            <div className="pulse"></div>
          </div>

          <p>Introducing Roominate 2.0</p>
        </div>

        <h1>Build beautiful space at the speed of though with Roominate</h1>

        <p className="subtitle">
          Roominate is an AI-first design environment that helps you visualize, render, and ship architectural projects faster than ever.
        </p>

        <div className="actions">
          <a href="#upload" className="cta">
            Start Building <ArrowRight className="icon" />
          </a>

          <Button variant="outline" size="lg" className="demo">
            Watch Demo
          </Button>
        </div>

        <div id="upload" className="upload-shell">
          <div className="grid-overlay" />

          <div className="upload-card">
            <div className="upload-head">
              <div className="upload-icon">
                <Layers className="icon" />
              </div>

              <h3>Upload your floor plan</h3>
              <p>supports JPG, PNG formats up to 10MB</p>
            </div>

            <Upload onComplete={handleUploadComplete} />
          </div>
        </div>
      </section>

      <section className="projects">
        <div className="section-inner">
          <div className="section-head">
            <div className="copy">
              <h2>Projects</h2>
              <p>Your latest work and shared community projects, all in one place.</p>
            </div>
          </div>

          <div className="projects-grid">
            {projects.map(({ id, name, renderedImage, sourceImage, timestamp }) => (
              <div key={id} className="project-card group" onClick={()=> navigate(`/visualizer/${id}`)}>
                <div className="preview">
                  <img src={renderedImage || sourceImage}
                    alt="Project"
                  />

                  <div className="badge">
                    <span>Community</span>
                  </div>
                </div>

                <div className="card-body">
                  <div>
                    <h3>{name}</h3>

                    <div className="meta">
                      <Clock size={12} />
                      <span>{new Date(timestamp).toLocaleDateString()}</span>
                      <span>By Arch. Sahr Foday</span>
                    </div>
                  </div>
                  <div className="arrow">
                    <ArrowUpRight size={18} />
                  </div>
                  <div className="delete-btn" onClick={(e)=> { e.stopPropagation(); handleDelete(id); }}>
                    <Trash2 className='w-4 h-4 text-red-500 hover:text-red-700' />
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>
      </section>
    </div>
  )
}    
