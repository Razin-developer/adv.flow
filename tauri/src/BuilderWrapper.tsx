import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import BuilderShell from '@/components/BuilderShell';

export default function BuilderWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!id) {
    return <div>No workflow ID provided.</div>;
  }

  return (
    <BuilderShell 
      mode="edit" 
      workflowId={id} 
      onBack={() => navigate(searchParams.get('from') === 'in-app' ? '/in-app' : '/workflows')} 
    />
  );
}
