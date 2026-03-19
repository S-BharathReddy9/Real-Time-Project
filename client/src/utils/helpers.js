export const formatViewers      = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);
export const formatViewerCount  = formatViewers;
export const formatTime    = (d) => new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
export const getInitials   = (n='') => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
export const timeAgo = (date) => {
  const s = Math.floor((Date.now()-new Date(date))/1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};
