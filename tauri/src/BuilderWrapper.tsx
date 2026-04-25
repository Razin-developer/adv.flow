import { useParams, useNavigate } from 'react-router-dom';
import BuilderShell from '@/components/BuilderShell';

export default function BuilderWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <div>No workflow ID provided.</div>;
  }

  return (
    <BuilderShell 
      mode="edit" 
      workflowId={id} 
      onBack={() => navigate('/workflows')} 
    />
  );
}
