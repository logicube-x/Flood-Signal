import React, { useState, useEffect } from 'react';
import { LocationPickerMap } from '../components/map/LocationPickerMap';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { submitReport, checkDuplicates } from '../lib/api';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Info, 
  CheckCircle2, 
  X, 
  UploadCloud, 
  FileCheck, 
  Clock, 
  Layers, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export function Report({ onAddIncident, onNavigateToOverview }) {
  const [formData, setFormData] = useState({
    title: '', description: '', lat: null, lng: null,
    depth: '', severity: 'low', roadBlocked: false, criticalFacility: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });

  // Photo uploads state
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoError, setPhotoError] = useState(null);

  // Duplicate detection state
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [hasAcknowledgedDuplicates, setHasAcknowledgedDuplicates] = useState(false);

  useEffect(() => {
    if (formData.lat && formData.lng) {
      setManualCoords({ lat: formData.lat.toFixed(6), lng: formData.lng.toFixed(6) });
      
      // Perform automatic background duplicate scan
      let active = true;
      async function scanDuplicates() {
        setIsCheckingDuplicates(true);
        try {
          const res = await checkDuplicates(formData.lat, formData.lng);
          if (active && Array.isArray(res.potentialDuplicates)) {
            setPotentialDuplicates(res.potentialDuplicates);
            setHasAcknowledgedDuplicates(false);
          }
        } catch (e) {
          console.warn('Duplicate check could not complete:', e.message);
        } finally {
          if (active) setIsCheckingDuplicates(false);
        }
      }
      scanDuplicates();
      return () => { active = false; };
    }
  }, [formData.lat, formData.lng]);

  const handleManualCoordChange = (field, value) => {
    setManualCoords(prev => ({ ...prev, [field]: value }));
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      setFormData(prev => ({ ...prev, [field]: parsed }));
      setErrors(prev => ({ ...prev, location: null }));
    }
  };

  const handleFileSelect = (e) => {
    setPhotoError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedPhotos.length + files.length > 3) {
      setPhotoError('You can attach a maximum of 3 photographs per report.');
      return;
    }

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 4 * 1024 * 1024; // 4 MB

    const newPhotos = [];
    for (const file of files) {
      if (!acceptedTypes.includes(file.type)) {
        setPhotoError(`"${file.name}" is not supported. Please select JPEG, PNG, or WebP images.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setPhotoError(`"${file.name}" exceeds the 4MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
        return;
      }

      // Read as base64 for preview and payload
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedPhotos(prev => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            dataBase64: event.target.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input value so same file can be reselected if deleted
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.lat || !formData.lng) newErrors.location = 'Please select a location on the map';
    
    const depthNum = parseInt(formData.depth, 10);
    if (isNaN(depthNum) || depthNum < 0 || depthNum > 500) {
      newErrors.depth = 'Enter a valid depth (0-500 cm)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Warn if potential duplicates exist and citizen hasn't acknowledged
    if (potentialDuplicates.length > 0 && !hasAcknowledgedDuplicates) {
      setSubmitError('Potential duplicate reports were detected nearby. Please review the duplicate warning above and click "Proceed With Submission" to confirm your report is distinct.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = { 
        ...formData, 
        depth: parseInt(formData.depth, 10),
        photos: selectedPhotos.map(p => ({
          name: p.name,
          dataBase64: p.dataBase64
        }))
      };
      const result = await submitReport(payload);
      onAddIncident(result);
      setIsSuccess(true);
      window.scrollTo(0,0);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-8 border border-surface-200 text-center shadow-sm">
        <div className="w-16 h-16 bg-accent-teal/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-accent-teal" />
        </div>
        <h2 className="text-2xl font-editorial text-brand-900 mb-2">Report Successfully Submitted</h2>
        <p className="text-brand-600 mb-4">
          Thank you. Your report has been logged with verifiable audit attribution and added to the municipal priority queue.
        </p>
        {selectedPhotos.length > 0 && (
          <p className="text-xs text-accent-teal font-medium mb-8">
            ✓ {selectedPhotos.length} photograph(s) securely uploaded and cataloged.
          </p>
        )}
        <Button onClick={onNavigateToOverview} size="lg">Return to System Overview</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="bg-brand-900 text-white p-4 sm:p-5 flex gap-4 items-start shadow-sm mb-8">
        <AlertTriangle className="w-6 h-6 text-accent-amber shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider mb-1">Safety Notice</h3>
          <p className="text-sm text-brand-100 leading-relaxed">If you are in immediate danger or witnessing a life-threatening emergency, please call local emergency services directly. This platform is for monitoring municipal infrastructure.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Incident Details */}
        <fieldset className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm">
          <legend className="text-sm font-semibold text-brand-500 uppercase tracking-widest px-2 -mx-2 mb-4 block">Incident Overview</legend>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-brand-900 mb-1.5">Incident Title <span className="text-accent-red">*</span></label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => { setFormData(prev => ({...prev, title: e.target.value})); setErrors(prev => ({...prev, title: null})); }}
                placeholder="e.g., Alkapuri Underpass Waterlogging"
                className={`w-full p-2.5 bg-surface-50 border ${errors.title ? 'border-accent-red focus:ring-accent-red' : 'border-surface-200 focus:ring-brand-900'} rounded-sm focus:outline-none focus:ring-1 text-sm`}
              />
              {errors.title && <p className="text-accent-red text-xs mt-1.5 font-medium">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-900 mb-1.5">Detailed Description <span className="text-accent-red">*</span></label>
              <textarea 
                rows={4}
                value={formData.description}
                onChange={e => { setFormData(prev => ({...prev, description: e.target.value})); setErrors(prev => ({...prev, description: null})); }}
                placeholder="Describe water depth, traffic conditions, blocked lanes, or nearby premises..."
                className={`w-full p-2.5 bg-surface-50 border ${errors.description ? 'border-accent-red focus:ring-accent-red' : 'border-surface-200 focus:ring-brand-900'} rounded-sm focus:outline-none focus:ring-1 text-sm`}
              />
              {errors.description && <p className="text-accent-red text-xs mt-1.5 font-medium">{errors.description}</p>}
            </div>
          </div>
        </fieldset>

        {/* Location Picker */}
        <fieldset className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm">
          <legend className="text-sm font-semibold text-brand-500 uppercase tracking-widest px-2 -mx-2 mb-4 block">Location Details</legend>
          
          <div className="mb-4">
            <p className="text-sm text-brand-600 mb-2">Click on the map to set the exact incident coordinates:</p>
            <div className="h-64 sm:h-80 border border-surface-200 rounded overflow-hidden">
               <LocationPickerMap 
                 selectedLocation={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : null}
                 onLocationSelect={loc => {
                   setFormData(prev => ({ ...prev, lat: loc.lat, lng: loc.lng }));
                   setErrors(prev => ({ ...prev, location: null }));
                 }}
               />
            </div>
            {errors.location && <p className="text-accent-red text-xs mt-2 font-medium">{errors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
             <div>
               <label className="block text-xs font-medium text-brand-700 mb-1 uppercase tracking-wider">Latitude</label>
               <input 
                 type="text" 
                 value={manualCoords.lat}
                 onChange={e => handleManualCoordChange('lat', e.target.value)}
                 className="w-full p-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono"
                 placeholder="e.g. 22.3072"
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-brand-700 mb-1 uppercase tracking-wider">Longitude</label>
               <input 
                 type="text" 
                 value={manualCoords.lng}
                 onChange={e => handleManualCoordChange('lng', e.target.value)}
                 className="w-full p-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-brand-900 font-mono"
                 placeholder="e.g. 73.1812"
               />
             </div>
          </div>
        </fieldset>

        {/* Potential Duplicate Notification Banner */}
        {potentialDuplicates.length > 0 && (
          <div className="bg-accent-amber/10 border-l-4 border-accent-amber p-4 sm:p-5 rounded-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-brand-900">
                    Potential Duplicate Reports Detected ({potentialDuplicates.length} nearby)
                  </h4>
                  <span className="text-[10px] font-mono text-brand-600 bg-white px-2 py-0.5 border border-surface-200 rounded">
                    Radius &lt; 300m · Active Incidents
                  </span>
                </div>
                <p className="text-xs text-brand-700 leading-relaxed">
                  Other citizens have submitted reports near this location within the past 4 hours. You can inspect existing reports below to see if the issue is already logged. If this is a separate occurrence or new observation, you may proceed.
                </p>

                <div className="space-y-2 pt-1">
                  {potentialDuplicates.map(dup => (
                    <div key={dup.id} className="bg-white p-2.5 border border-surface-200 rounded-sm flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-brand-900 block">{dup.title}</span>
                        <span className="text-[10px] text-brand-500 font-mono">
                          {dup.distanceMeters}m away · {dup.timeAgo} mins ago · Status: {dup.status}
                        </span>
                      </div>
                      <Badge variant={dup.verified ? 'success' : 'default'}>
                        {dup.verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={hasAcknowledgedDuplicates}
                      onChange={e => {
                        setHasAcknowledgedDuplicates(e.target.checked);
                        if (e.target.checked) setSubmitError(null);
                      }}
                      className="w-4 h-4 text-brand-900 rounded focus:ring-brand-900 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-brand-900">
                      I have reviewed the nearby incidents and confirm my submission is distinct or provides new details.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conditions */}
        <fieldset className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm">
          <legend className="text-sm font-semibold text-brand-500 uppercase tracking-widest px-2 -mx-2 mb-4 block">Observed Conditions</legend>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-900 mb-1.5">Est. Water Depth (cm) <span className="text-accent-red">*</span></label>
                <input 
                  type="number" 
                  value={formData.depth}
                  onChange={e => { setFormData(prev => ({...prev, depth: e.target.value})); setErrors(prev => ({...prev, depth: null})); }}
                  placeholder="0"
                  className={`w-full p-2.5 bg-surface-50 border ${errors.depth ? 'border-accent-red focus:ring-accent-red' : 'border-surface-200 focus:ring-brand-900'} rounded-sm focus:outline-none focus:ring-1 text-sm`}
                />
                {errors.depth && <p className="text-accent-red text-xs mt-1.5 font-medium">{errors.depth}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-900 mb-1.5">Apparent Severity <span className="text-accent-red">*</span></label>
                <div className="flex border border-surface-200 rounded-sm overflow-hidden">
                  {[
                    { key: 'low', label: 'Low' },
                    { key: 'moderate', label: 'Moderate' },
                    { key: 'high', label: 'High' },
                    { key: 'critical', label: 'Critical' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, severity: key })); }}
                      className={`flex-1 h-10 text-xs font-semibold uppercase tracking-wider transition-colors border-r border-surface-200 last:border-r-0 ${
                        (formData.severity === key || (key === 'moderate' && formData.severity === 'medium'))
                          ? 'bg-brand-900 text-white' 
                          : 'bg-surface-50 text-brand-700 hover:bg-surface-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 p-3 bg-surface-50 border border-surface-200 cursor-pointer hover:bg-surface-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.roadBlocked}
                  onChange={e => setFormData(prev => ({...prev, roadBlocked: e.target.checked}))}
                  className="w-4 h-4 text-brand-900 bg-white border-surface-300 focus:ring-brand-900 cursor-pointer"
                />
                <span className="text-sm font-medium text-brand-900">Road appears fully blocked to traffic</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-surface-50 border border-surface-200 cursor-pointer hover:bg-surface-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.criticalFacility}
                  onChange={e => setFormData(prev => ({...prev, criticalFacility: e.target.checked}))}
                  className="w-4 h-4 text-brand-900 bg-white border-surface-300 focus:ring-brand-900 cursor-pointer"
                />
                <span className="text-sm font-medium text-brand-900">Location is near a critical facility (hospital, school, substation)</span>
              </label>
            </div>
          </div>
        </fieldset>

        {/* Media / Photo Evidence Upload */}
        <fieldset className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm">
          <legend className="text-sm font-semibold text-brand-500 uppercase tracking-widest px-2 -mx-2 mb-4 block">
            Photographic Evidence
          </legend>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-surface-300 bg-surface-50 p-6 flex flex-col items-center justify-center text-center rounded-sm">
              <Camera className="w-8 h-8 text-brand-400 mb-2" />
              <p className="text-sm font-medium text-brand-900 mb-1">Upload Incident Photos</p>
              <p className="text-xs text-brand-500 mb-4">
                JPEG, PNG, or WebP. Up to 3 photographs, maximum 4MB each.
              </p>

              <label className="cursor-pointer">
                <span className="px-4 py-2 bg-brand-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-brand-800 transition-colors inline-flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  Choose Images
                </span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={selectedPhotos.length >= 3}
                />
              </label>
            </div>

            {photoError && (
              <div className="text-xs text-accent-red font-medium p-2.5 bg-accent-red/10 border-l-2 border-accent-red">
                {photoError}
              </div>
            )}

            {/* Selected Photos Previews */}
            {selectedPhotos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {selectedPhotos.map((photo, index) => (
                  <div key={index} className="relative group border border-surface-200 bg-white p-2 rounded-sm shadow-xs flex flex-col">
                    <img 
                      src={photo.dataBase64} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-28 object-cover rounded-sm mb-2"
                    />
                    <div className="flex items-center justify-between text-[11px] text-brand-600 truncate font-mono">
                      <span className="truncate">{photo.name}</span>
                      <span className="shrink-0 text-brand-400">({(photo.size / 1024).toFixed(0)}KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-3 right-3 p-1 bg-brand-900/80 hover:bg-accent-red text-white rounded-full transition-colors"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        {submitError && (
          <div className="bg-accent-red/10 border-l-4 border-accent-red p-4 text-sm text-accent-red font-medium">
            Error submitting report: {submitError}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto px-12">
            {isSubmitting ? 'Transmitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </div>
  );
}
