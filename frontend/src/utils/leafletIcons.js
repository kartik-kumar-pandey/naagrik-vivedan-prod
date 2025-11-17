import L from 'leaflet';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';

let iconsConfigured = false;

export const ensureLeafletIcons = () => {
  if (iconsConfigured) return;

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetina,
    iconUrl: icon,
    shadowUrl: shadow,
  });

  iconsConfigured = true;
};

export default ensureLeafletIcons;

