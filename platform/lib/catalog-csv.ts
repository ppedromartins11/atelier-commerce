// Strict, semicolon-separated CSV to avoid ambiguous Brazilian decimal commas.
// Quotes and line breaks inside quoted fields are handled without external packages.
export type CatalogCsvRow = {
 title:string;sku:string;price:string;stock:string;
 description:string;category_slug:string;
};
const HEADER=['title','sku','price','stock','description','category_slug'] as const;

export function parseCatalogCsv(source:string):CatalogCsvRow[] {
 const data=source.replace(/^\uFEFF/,'');
 const lines:string[][]=[];
 let line:string[]=[];
 let cell='';
 let quoted=false;
 for(let i=0;i<data.length;i++) {
  const ch=data[i];
  if(quoted){
   if(ch==='"' && data[i+1]==='"'){cell+='"';i++;}
   else if(ch==='"'){quoted=false;}
   else{cell+=ch;}
  } else if(ch==='"') {
   if(cell.trim())throw new Error('Aspas inválidas no arquivo.');
   quoted=true;
  } else if(ch===';'){
   line.push(cell.trim());cell='';
  } else if(ch==='\n'){
   line.push(cell.trim());cell='';
   if(line.some(Boolean))lines.push(line);
   line=[];
  } else if(ch!=='\r')cell+=ch;
 }
 if(quoted)throw new Error('Há aspas sem fechamento no arquivo.');
 line.push(cell.trim());
 if(line.some(Boolean))lines.push(line);
 if(lines.length<2)throw new Error('O arquivo precisa conter cabeçalho e produtos.');
 const header=lines.shift()!;
 if(header.length!==HEADER.length ||
    header.some((value,i)=>value.toLowerCase()!==HEADER[i])) {
  throw new Error('Cabeçalho inválido. Use o modelo CSV fornecido.');
 }
 if(lines.length>100)throw new Error('Importe no máximo 100 produtos por arquivo.');
 return lines.map((cols,i)=>{
  if(cols.length!==HEADER.length)throw new Error('Linha '+(i+2)+' tem colunas inválidas.');
  return Object.fromEntries(HEADER.map((key,j)=>[key,cols[j]])) as CatalogCsvRow;
 });
}
