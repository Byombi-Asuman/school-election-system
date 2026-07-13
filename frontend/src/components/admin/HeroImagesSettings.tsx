import React, { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import { Icons } from '../ui/Icons';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const MAX_IMAGES = 10;

export const HeroImagesSettings: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    settingsService.get()
      .then((s) => setImages(s.heroImages || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed — remove one first`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const updated = await settingsService.addHeroImages(files);
      setImages(updated.heroImages || []);
      toast.success('Images added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async (url: string) => {
    try {
      const updated = await settingsService.removeHeroImage(url);
      setImages(updated.heroImages || []);
      toast.success('Image removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return null;

  return (
    <div className="card p-6 mt-6">
      <h3 className="font-semibold text-slate-900 mb-1">Homepage Slider Images</h3>
      <p className="text-xs text-slate-500 mb-4">
        Upload up to {MAX_IMAGES} photos to rotate through the login page's background — school events, campus life, past
        elections, anything you like. If none are uploaded, a set of default illustrations is shown instead.
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
        {images.map((url) => (
          <div key={url} className="relative group aspect-video rounded-lg overflow-hidden bg-slate-100">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove"
            >
              <Icons.X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <label className="aspect-video rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors text-slate-400 hover:text-primary-600">
            {uploading ? (
              <span className="text-xs">Uploading…</span>
            ) : (
              <>
                <Icons.Plus className="w-5 h-5 mb-1" />
                <span className="text-xs">Add photo</span>
              </>
            )}
            <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={handleUpload} />
          </label>
        )}
      </div>

      {images.length === 0 && (
        <p className="text-xs text-slate-400">No custom images yet — the login page is currently showing the default illustrations.</p>
      )}
    </div>
  );
};