import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router'
import { generate3DView } from '../../lib/ai.actions';
import { Box, Check, Copy, Download, RefreshCcw, Share2, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { createProject, getProjectById } from '../../lib/puter.action';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

/**
 * Visualizer page component for rendering and managing 3D floor plan projects.
 * @returns {JSX.Element} Visualizer interface with render panel and controls.
 */
const visualizerId = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId } = useOutletContext<AuthContext>()

  const hasInitialGenerated = useRef(false);

  const [ project, setProject ] = useState<DesignItem | null>(null);
  const [ isProjectLoading, setIsProjectLoading ] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Displays a transient toast notification.
   * @param {string} message - Message to display.
   * @param {'success' | 'error'} type - Toast style.
   */
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  /**
   * Navigates back to the home page.
   */
  const handleBack = () => navigate('/');

  const handleExport = ()=> {
    if(!currentImage) return;

    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `roominate-${id || 'design'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Copies the shareable project URL to the clipboard.
   */
  const handleCopyUrl = async () => {
    const shareUrl = `${window.location.origin}/visualizer/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Confirms the share action: makes the project public and shows the share link.
   */
  const handleConfirmShare = async () => {
    if (!project) return;

    setIsSharing(true);
    try {
      const updatedProject = await createProject({ item: project, visibility: 'public' });

      if (updatedProject) {
        setProject(updatedProject);
        setShowShareModal(true);
        showToast('Project shared successfully');
      } else {
        showToast('Failed to share project', 'error');
      }
    } catch (error) {
      console.error('Share failed', error);
      showToast('Failed to share project', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Makes an already-shared project private again.
   */
  const handleUnshare = async () => {
    if (!project) return;

    setIsSharing(true);
    try {
      const updatedProject = await createProject({ item: project, visibility: 'private' });

      if (updatedProject) {
        setProject(updatedProject);
        setShowShareModal(false);
        showToast('Project is now private');
      } else {
        showToast('Failed to update project', 'error');
      }
    } catch (error) {
      console.error('Unshare failed', error);
      showToast('Failed to update project', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Runs AI generation to create a 3D view from the source floor plan and saves the result.
   * @param {DesignItem} item - Design item containing source image to generate from.
   */
  const runGeneration = async (item: DesignItem) => {
    if (!id || !item.sourceImage) return;

    try {
      setIsProcessing(true);
      const result = await generate3DView({ sourceImage: item.sourceImage });

      if (result.renderedImage) {
        setCurrentImage(result.renderedImage);

        const updatedItem = {
          ...item,
          renderedImage: result.renderedImage,
          renderedPath: result.renderedPath,
          timestamp: Date.now(),
          ownerId: item.ownerId ?? userId ?? null,
          isPublic: item.isPublic ?? false,
        }

        const saved = await createProject({ item: updatedItem, visibility: 'private' });

        if(saved) {
          setProject(saved)
          setCurrentImage(saved.renderedImage || result.renderedImage)
        }
      }
    } catch (error) {
      console.error('Generation failed', error);
    } finally {
      setIsProcessing(false);
    }
  }

    useEffect(() => {
    let isMounted = true;

    const loadProject = async () => {
      if (!id) {
        setIsProjectLoading(false);
        return;
      }

      setIsProjectLoading(true);

      const fetchedProject = await getProjectById({ id });

      if (!isMounted) return;

      setProject(fetchedProject);
      setCurrentImage(fetchedProject?.renderedImage || null);
      setIsProjectLoading(false);
      hasInitialGenerated.current = false;
    };

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (
      isProjectLoading ||
      hasInitialGenerated.current ||
      !project?.sourceImage
    )
      return;

    if (project.renderedImage) {
      setCurrentImage(project.renderedImage);
      hasInitialGenerated.current = true;
      return;
    }

    hasInitialGenerated.current = true;
    void runGeneration(project);
  }, [project, isProjectLoading]);

  const isPublic = project?.isPublic ?? false;

  return (
    <div className='visualizer'>
      <nav className='topbar'>
        <div className='brand'>
          <Box className='logo' />

          <span className='name'>Roominate</span>
        </div>
        <Button variant='ghost' size='sm' onClick={handleBack} className='exit'>
          <X className='icon' /> Exit Editor
        </Button>
      </nav>

      <section className='content'>
        <div className='panel'>
          <div className='panel-header'>
            <div className='panel-meta'>
              <p>Project</p>
              <h2>{project?.name || `Residence ${id}`}</h2>
              <p className='note'>Created by You</p>
              {isPublic && (
                <span className='share-badge'>
                  <Check className='icon' /> Public
                </span>
              )}
            </div>

            <div className='panel-actions'>
              <Button
                size='sm'
                onClick={handleExport}
                className='export'
                disabled={!currentImage}
              >
                <Download className='w-4 h-4 mr-2' /> Export
              </Button>
              <Button
                size='sm'
                onClick={() => setShowShareModal(true)}
                className={`share ${isPublic ? 'shared' : ''}`}
                disabled={isSharing || !project}
              >
                <Share2 className='w-4 h-4 mr-2' />
                {isPublic ? 'Shared' : 'Share'}
              </Button>
            </div>
          </div>

          <div className={`render-area ${isProcessing || isSharing ? 'is-processing' : ''}`}>
            {isProjectLoading ? (
              <div className='render-skeleton'>
                <div className='skeleton-shimmer' />
              </div>
            ) : currentImage ? (
              <img src={currentImage} alt="AI Render" className='render-img' />
            ) : (
              <div className='render-placeholder'>
                {project?.sourceImage && (
                  <img src={project?.sourceImage} alt="Original" className='render-fallback' />
                )}
              </div>
            )}

            {(isProcessing || isSharing) && (
              <div className='render-overlay'>
                <div className='rendering-card'>
                  <RefreshCcw className='spinner' />
                  <span className='title'>{isSharing ? 'Updating...' : 'Rendering...'}</span>
                  <span className='subtitle'>
                    {isSharing
                      ? 'Updating project visibility'
                      : 'Generating your 3D visualization'}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        <div className='panel compare'>
          <div className='panel-header'>
            <div className='panel-meta'>
              <p>Comparison</p>
              <h3>Before and After</h3>
            </div>
            <div className='hint'>Drag to compare</div>
          </div>

          <div className='compare-stage'>
            {project?.sourceImage && currentImage ? (
              <ReactCompareSlider
                defaultValue={50}
                style={{ width: '100%', height: 'auto' }}
                itemOne={
                  <ReactCompareSliderImage src={project?.sourceImage} alt='before' className='compare-img' />
                }

                itemTwo={
                  <ReactCompareSliderImage src={currentImage || project?.renderedImage || ''} alt='after' className='compare-img' />
                }
              />
            ) : (
              <div className='compare-fallback'>
                {project?.sourceImage && (
                  <img src={project.sourceImage} alt='Before' className='compare-img' />
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {showShareModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4' onClick={() => setShowShareModal(false)}>
          <div className='bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-200' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-serif font-bold text-black'>{isPublic ? 'Project is Public' : 'Share Project'}</h3>
              <button className='w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors' onClick={() => setShowShareModal(false)}>
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='text-center mb-6'>
              <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                <Share2 className='text-blue-500 w-6 h-6' />
              </div>
              <h4 className='text-black font-semibold mb-2'>{isPublic ? 'Anyone with the link can view this project' : 'Make this project public?'}</h4>
              <p className='text-zinc-600 text-sm leading-relaxed'>
                {isPublic
                  ? 'Copy the link below to share your 3D visualization with anyone.'
                  : 'This will make your project visible to anyone with the link. You can unshare it at any time.'}
              </p>
            </div>

            <div className='bg-zinc-50 border border-zinc-200 rounded-lg p-3 mb-4 text-left'>
              <label className='text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-1'>Shareable link</label>
              <div className='flex items-center gap-2'>
                <input className='flex-1 bg-transparent border-none outline-none text-sm font-mono text-zinc-900' readOnly value={`${window.location.origin}/visualizer/${id}`} />
                <button className='px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors flex-shrink-0' onClick={handleCopyUrl}>
                  {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                  {copied ? ' Copied' : ' Copy'}
                </button>
              </div>
            </div>

            <div className='flex gap-3'>
              {!isPublic && (
                <button className='flex-1 bg-primary text-white hover:bg-orange-600 py-2.5 rounded-lg font-medium transition-colors' onClick={handleConfirmShare} disabled={isSharing}>
                  {isSharing ? 'Sharing...' : 'Share Publicly'}
                </button>
              )}
              <button
                className='flex-1 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 py-2.5 rounded-lg font-medium transition-colors'
                onClick={() => (isPublic ? handleUnshare() : setShowShareModal(false))}
                disabled={isSharing}
              >
                {isPublic ? 'Make Private' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border rounded-xl shadow-2xl px-4 py-3 min-w-[280px] max-w-sm ${toast.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          {toast.type === 'success' ? (
            <Check className='w-5 h-5 text-green-500 flex-shrink-0' />
          ) : (
            <X className='w-5 h-5 text-red-500 flex-shrink-0' />
          )}
          <span className='text-sm font-medium text-zinc-900 flex-1'>{toast.message}</span>
          <button className='text-zinc-400 hover:text-zinc-600 p-1' onClick={() => setToast(null)}>
            <X className='w-4 h-4' />
          </button>
        </div>
      )}
    </div>
  )
}

export default visualizerId
