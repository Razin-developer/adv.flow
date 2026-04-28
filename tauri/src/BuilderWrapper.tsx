import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BuilderShell from '@/components/BuilderShell';

export default function BuilderWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { backTo?: string } | null)?.backTo || '/workflows';

  if (!id) {
    return <div>No workflow ID provided.</div>;
  }

  return (
    <BuilderShell 
      mode="edit" 
      workflowId={id} 
      onBack={() => navigate(backTo)}
    />
  );
}
