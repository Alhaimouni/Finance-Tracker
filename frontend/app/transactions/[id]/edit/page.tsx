import TransactionForm from '../../_components/TransactionForm';

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionForm editId={id} />;
}
