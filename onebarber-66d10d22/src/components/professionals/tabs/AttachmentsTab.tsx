import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Trash2, FileText, Loader2, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description?: string;
}

interface AttachmentsTabProps {
  professionalId?: string;
  isReadOnly: boolean;
}

const documentTypes = [
  { value: 'contrato', label: 'Contrato de Trabalho' },
  { value: 'cnh', label: 'CNH' },
  { value: 'rg', label: 'RG' },
  { value: 'cpf', label: 'CPF' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { value: 'carteira_trabalho', label: 'Carteira de Trabalho' },
  { value: 'registro_profissional', label: 'Registro Profissional' },
  { value: 'outro', label: 'Outro' },
];

export function AttachmentsTab({ professionalId, isReadOnly }: AttachmentsTabProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (professionalId) {
      fetchAttachments();
    }
  }, [professionalId]);

  const fetchAttachments = async () => {
    if (!professionalId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_attachments')
        .select('*')
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar anexos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedDocType) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione o tipo de documento antes de enviar.',
      });
      return;
    }

    if (!professionalId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Salve o profissional antes de adicionar anexos.',
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: `O arquivo ${file.name} excede o limite de 10MB.`,
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${professionalId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('professional-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('professional-attachments')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('professional_attachments')
          .insert({
            professional_id: professionalId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            document_type: selectedDocType,
            description: description || null,
          });

        if (dbError) throw dbError;
      }

      toast({ title: 'Arquivo(s) enviado(s) com sucesso!' });
      setSelectedDocType('');
      setDescription('');
      fetchAttachments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar arquivo',
        description: error.message,
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!attachment.id) return;

    try {
      // Extract file path from URL for deletion
      const urlParts = attachment.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      await supabase.storage
        .from('professional-attachments')
        .remove([filePath]);

      const { error } = await supabase
        .from('professional_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;

      toast({ title: 'Anexo excluído com sucesso!' });
      fetchAttachments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir anexo',
        description: error.message,
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeName = (value: string) => {
    return documentTypes.find((t) => t.value === value)?.label || value;
  };

  if (!professionalId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Salve o profissional primeiro</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Para adicionar anexos, primeiro salve os dados básicos do profissional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!isReadOnly && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium">Adicionar Novo Anexo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tipo de Documento *</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Contrato assinado em 01/2024"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>Selecionar Arquivos</span>
              </div>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading || !selectedDocType}
              />
            </label>
            <span className="text-sm text-muted-foreground">
              Máximo 10MB por arquivo. Múltiplos arquivos permitidos.
            </span>
          </div>
        </div>
      )}

      {/* Attachments List */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : attachments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum anexo encontrado
                </TableCell>
              </TableRow>
            ) : (
              attachments.map((attachment) => (
                <TableRow key={attachment.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{attachment.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getDocTypeName(attachment.document_type)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {attachment.description || '-'}
                  </TableCell>
                  <TableCell>{formatFileSize(attachment.file_size)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={attachment.file_url} download={attachment.file_name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(attachment)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
