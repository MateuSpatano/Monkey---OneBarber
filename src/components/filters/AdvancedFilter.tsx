import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'date-range';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FilterValue {
  [key: string]: string | undefined;
}

interface AdvancedFilterProps {
  filters: FilterOption[];
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onClear: () => void;
}

export function AdvancedFilter({
  filters,
  values,
  onChange,
  onClear,
}: AdvancedFilterProps) {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = Object.values(values).filter(
    (v) => v !== undefined && v !== '' && v !== 'all'
  ).length;

  const handleChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value === 'all' ? undefined : value });
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="default" 
          className={cn(
            "gap-2 rounded-xl h-10 border-none bg-white shadow-sm font-bold hover:bg-zinc-50 transition-all",
            activeFiltersCount > 0 && "text-primary"
          )}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge className="ml-1 bg-primary text-white border-none h-5 min-w-[20px] px-1 font-black text-[10px] rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 rounded-2xl border-none shadow-2xl p-5" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-sm uppercase tracking-tight text-zinc-400">Filtros Avançados</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{filter.label}</Label>
                
                {filter.type === 'select' && filter.options && (
                  <Select
                    value={values[filter.key] || 'all'}
                    onValueChange={(value) => handleChange(filter.key, value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={filter.placeholder || 'Selecione'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filter.type === 'text' && (
                  <Input
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder}
                    className="h-9"
                  />
                )}

                {filter.type === 'date' && (
                  <Input
                    type="date"
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    className="h-9"
                  />
                )}

                {filter.type === 'number' && (
                  <Input
                    type="number"
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder}
                    className="h-9"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              size="sm" 
              onClick={() => setOpen(false)}
              className="premium-button-solid h-9 px-4 shadow-md rounded-xl"
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
