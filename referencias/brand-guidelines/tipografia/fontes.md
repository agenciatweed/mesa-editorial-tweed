# Fontes

## Fonte Principal
- **Inter**

## Uso
- Inter 28pt Bold: Headlines, CTAs, elementos destacados
- Inter 28pt Bold Italic: Ênfases em Headlines, CTAs, elementos destacados
- Inter 24pt Medium: Texto corpo
- Inter 24pt Medium Italic: Ênfases no Texto corpo
- Inter 18pt Regular: Textos menores
- Inter 18pt Regular Italic: Ênfase em Textos menores

## Links para os arquivos das fontes:
- [Link para a Fonte Inter 28pt Bold](./inter-28pt-bold.ttf)
- [Link para a Fonte Inter 28pt Bold Italic](./inter-28pt-bolditalic.ttf)
- [Link para a Fonte Inter 24pt Medium](./inter-24pt-medium.ttf)
- [Link para a Fonte Inter 24pt Medium Italic](./inter-24pt-mediumitalic.ttf)
- [Link para a Fonte Inter 18pt Regular](./inter-18pt-regular.ttf)
- [Link para a Fonte Inter 18pt Regular Italic](./inter-18pt-italic.ttf)

## Embed codes para fallback caso não seja possível utilizar os arquivos TTF fornecidos:
### Link - Embed code in the <head> of your html:
```
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
```
### Import - Embed code in the <head> of your html:
```
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
</style>
```
### Link e Import - Inter: CSS class for a variable style:
```
// <weight>: Use a value from 100 to 900
// <uniquifier>: Use a unique and descriptive class name
.inter-<uniquifier> {
  font-family: "Inter", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}
```
