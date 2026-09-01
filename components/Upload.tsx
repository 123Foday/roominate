import { 
  CheckCircle2, 
  ImageIcon, 
  UploadIcon 
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useOutletContext } from 'react-router';
import {
   PROGRESS_INCREMENT, 
   PROGRESS_INTERVAL_MS, 
   REDIRECT_DELAY_MS 
} from '../lib/constants';

interface UploadProps {
  onComplete?: (base64Data: string) => void;
}

/**
 * File upload component with drag-and-drop support and progress indicator.
 * @param {UploadProps} props - Component props.
 * @param {Function} props.onComplete - Callback invoked with base64 data when upload completes.
 * @returns {JSX.Element} Upload component with dropzone or progress display.
 */
const Upload = ({ onComplete }: UploadProps) => {
  const [ file, setFile ] = useState<File | null>(null);
  const [ isDragging, setIsDragging ] = useState(false);
  const [ progress, setProgress ] = useState(0);

  const { isSignedIn } = useOutletContext<AuthContext>();

  /**
   * Processes a selected file by reading it as base64 and triggering progress simulation.
   * @param {File} file - File to process.
   */
  const processFile = useCallback((file: File)=> {
    if(!isSignedIn) return;

    setFile(file);
    setProgress(0);

    const reader = new FileReader();
    reader.onloadend = ()=> {
      const base64Data = reader.result as string;

      const interval = setInterval(()=> {
        setProgress((prev)=> {
          const next = prev + PROGRESS_INCREMENT;
          if(next >= 100) {
            clearInterval(interval);
            setTimeout(()=> {
              onComplete?.(base64Data);
            }, REDIRECT_DELAY_MS);
            return 100;
          }
          return next;
        });
      }, PROGRESS_INTERVAL_MS);
    };
    reader.readAsDataURL(file);
  }, [isSignedIn, onComplete]);

  /**
   * Handles drag over event to enable drag-and-drop functionality.
   * @param {React.DragEvent} e - Drag event.
   */
  const handleDragOver = (e: React.DragEvent)=> {
    e.preventDefault();
    if(!isSignedIn) return;
    setIsDragging(true);
  };

  /**
   * Handles drag leave event to reset dragging state.
   */
  const handleDragLeave = ()=> {
    setIsDragging(false);
  };

  /**
   * Handles file drop event and processes the dropped image file.
   * @param {React.DragEvent} e - Drop event.
   */
  const handleDrop = (e: React.DragEvent)=> {
    e.preventDefault();
    setIsDragging(false);

    if(!isSignedIn) return;

    const droppedFile = e.dataTransfer.files[0];
    if(droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile);
    }
  };

  /**
   * Handles file input change event and processes the selected file.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Change event.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>)=> {
    if(!isSignedIn) return;

    const selectedFile = e.target.files?.[0];
    if(selectedFile) {
      processFile(selectedFile);
    }
  };

  return (
    <div className='upload'>
      {!file ? (
        <div 
          className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}       
        >
          <input 
            type='file'
            className='drop-input'
            accept='.jpg, .jpeg, .png, .webp'
            disabled={!isSignedIn}
            onChange={handleChange}
          />

          <div className='drop-content'>
            <div className='drop-icon'>
              <UploadIcon size={20} />
            </div>
            <p>
              {isSignedIn ? (
                "Click to upload or just drag and drop"
              ) : ("sign in or sign up with Puter to upload")}
            </p>
            <p className='help'>Maximum file size 50 MB.</p>
          </div>
        </div>
      ) : (
        <div className='upload-status'>
          <div className='status-content'>
            <div className='status-icon'>
              {progress === 100 ? (
                <CheckCircle2 className='check' />
              ) : (
                <ImageIcon className='image' />
              )}
            </div>

            <h3>{file.name}</h3>

            <div className='progress'>
              <div className='bar' style={{ width: `${progress}%` }} />

              <p className='status-text'>
                {progress < 100 ? 'Analyzing Floor Plan...' : 'Redirecting...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Upload
