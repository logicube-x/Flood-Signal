import React, { useState, useEffect } from 'react';
import { LocationPickerMap } from '../components/map/LocationPickerMap';
import { Button } from '../components/ui/Button';
import { submitReport } from '../lib/api';
import { AlertTriangle, MapPin, Camera, Info, CheckCircle2 } from 'lucide-react';

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

  useEffect(() => {
    if (formData.lat && formData.lng) {
      setManualCoords({ lat: formData.lat.toFixed(6), lng: formData.lng.toFixed(6) });
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

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = { ...formData, depth: parseInt(formData.depth, 10) };
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
        <p className="text-brand-600 mb-8">Thank you. Your report has been logged and added to the municipal priority queue. Responders will evaluate the situation shortly.</p>
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
                placeholder="e.g. Alkapuri Underpass Flooded"
                className={`w-full p-2.5 bg-surface-50 border ${errors.title ? 'border-accent-red focus:ring-accent-red' : 'border-surface-200 focus:ring-brand-900'} rounded-sm focus:outline-none focus:ring-1 text-sm`}
              />
              {errors.title && <p className="text-accent-red text-xs mt-1.5 font-medium">{errors.title}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-900 mb-1.5">Detailed Description <span className="text-accent-red">*</span></label>
              <textarea 
                value={formData.description}
                onChange={e => { setFormData(prev => ({...prev, description: e.target.value})); setErrors(prev => ({...prev, description: null})); }}
                placeholder="Describe the situation, specific hazards, or context..."
                rows={3}
                className={`w-full p-2.5 bg-surface-50 border ${errors.description ? 'border-accent-red focus:ring-accent-red' : 'border-surface-200 focus:ring-brand-900'} rounded-sm focus:outline-none focus:ring-1 text-sm resize-none`}
              />
              {errors.description && <p className="text-accent-red text-xs mt-1.5 font-medium">{errors.description}</p>}
            </div>
          </div>
        </fieldset>

        {/* Location Selection */}
        <fieldset className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm">
          <legend className="text-sm font-semibold text-brand-500 uppercase tracking-widest px-2 -mx-2 mb-4 block">Geographic Location</legend>
          
          <div className="mb-4">
            <p className="text-sm text-brand-700 mb-3">Click on the map to drop a pin, or enter precise coordinates manually.</p>
            <div className="h-[250px] md:h-[300px] border border-surface-200 relative isolate">
              <LocationPickerMap 
                selectedLocation={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : null}
                onLocationSelect={(lat, lng) => {
                  setFormData(prev => ({ ...prev, lat, lng }));
                  setErrors(prev => ({ ...prev, location: null }));
                }}
              />
            </div>
            {errors.location && <p className="text-accent-red text-xs mt-1.5 font-medium">{errors.location}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
                  {['low', 'medium', 'high', 'critical'].map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, severity: sev })); }}
                      className={`flex-1 h-10 text-xs font-semibold uppercase tracking-wider transition-colors border-r border-surface-200 last:border-r-0 ${
                        formData.severity === sev 
                          ? 'bg-brand-900 text-white' 
                          : 'bg-surface-50 text-brand-700 hover:bg-surface-100'
                      }`}
                    >
                      {sev}
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

        {/* Media */}
        <fieldset className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm">
          <legend className="text-sm font-semibold text-brand-500 uppercase tracking-widest px-2 -mx-2 mb-4 block">Photographic Evidence</legend>
          <div className="border-2 border-dashed border-surface-300 bg-surface-50 p-8 flex flex-col items-center justify-center text-center">
            <Camera className="w-8 h-8 text-brand-400 mb-3" />
            <p className="text-sm font-medium text-brand-900 mb-1">Upload Photo (Optional)</p>
            <p className="text-xs text-brand-500">Feature pending backend media storage implementation.</p>
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
