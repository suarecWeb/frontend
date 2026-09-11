// Redimensionado de imágenes en el navegador, antes de subirlas al servidor.
//
// Por qué existe: la app móvil precarga TODOS los slides activos al abrir, así
// que el peso del archivo se paga en datos del usuario final. Una imagen de
// 4000px de ancho se ve igual que una de 1080 en un teléfono, pero pesa mucho más.
//
// IMPORTANTE — por qué NO se convierte a JPEG:
// Se probó convertir todo a JPEG (calidad 0.85 y luego 0.95) y en ambos casos la
// imagen se degradaba de forma visible. La causa es el formato, no la calidad:
// JPEG comprime en bloques de 8x8 píxeles, lo que genera halos alrededor de los
// bordes nítidos. Los banners son diseños con TEXTO y formas planas, el peor caso
// para JPEG. PNG es sin pérdida y por eso se ve limpio.
// Conclusión: cada archivo conserva su formato. Si hay que bajar el peso de los
// PNG, va en el backend con una herramienta sin pérdida (pngquant/sharp), nunca
// reconvirtiendo el formato acá.

const MAX_WIDTH = 1080;
const JPEG_QUALITY = 0.95;

// Lee el archivo y lo convierte en un elemento de imagen ya decodificado
function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

// Reduce el ancho solo si excede el máximo. Devuelve el archivo original cuando
// ya está dentro del límite: reencodear un PNG sin necesidad solo lo degradaría
export async function compressImage(file: File): Promise<File> {
  try {
    const img = await cargarImagen(file);
    if (img.naturalWidth <= MAX_WIDTH) return file;

    const escala = MAX_WIDTH / img.naturalWidth;
    const ancho = MAX_WIDTH;
    const alto = Math.round(img.naturalHeight * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Mejora el resultado al reducir: sin esto los bordes salen dentados
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, ancho, alto);

    // Se respeta el formato de origen: un PNG sigue siendo PNG y no pierde nada
    const esPng = file.type === "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      esPng
        ? canvas.toBlob(resolve, "image/png")
        : canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    // Si redimensionar no achicó nada, no vale la pena perder el original
    if (blob.size >= file.size) return file;

    return new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });
  } catch {
    // Un error de canvas no debe impedir subir: es preferible una imagen pesada
    return file;
  }
}
