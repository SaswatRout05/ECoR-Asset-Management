import PlaceholderPage from '../components/PlaceholderPage';
import { RotateCcw } from 'lucide-react';

export default function ReturnAssets() {
  return (
    <PlaceholderPage
      title="Return Assets"
      icon={RotateCcw}
      breadcrumbs={[
        { label: 'Inventory' },
        { label: 'Return Assets' },
      ]}
      description="Process asset returns, inspect returned items, update inventory status, and manage the de-allocation workflow."
    />
  );
}
