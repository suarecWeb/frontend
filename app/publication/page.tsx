import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableRow, TableCell, TableHead, TableBody } from "@/components/ui/table";
import Link from "next/link";
import { Publication } from "@/interfaces/publication.interface";

const PublicationPage = () => {
  const [publications, setPublications] = useState<Publication[]>([]);

  useEffect(() => {
    // Fetch publications from API
    // setPublications(fetchedPublications);
  }, []);

  const handleEdit = (id: number) => {
    // Implement edit logic
  };

  const handleDelete = (id: number) => {
    // Implement delete logic
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 p-24">
      <h1 className="text-2xl font-bold">Publicaciones</h1>
      <Link href="/publication/create" className={buttonVariants({ variant: "default" })}>Crear Publicación</Link>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Título</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {publications.map(publication => (
            <TableRow key={publication.id}>
              <TableCell>{publication.id}</TableCell>
              <TableCell>{publication.title}</TableCell>
              <TableCell>
                <button onClick={() => handleEdit(publication.id)} className={buttonVariants({ variant: "default" })}>Editar</button>
                <button onClick={() => handleDelete(publication.id)} className={buttonVariants({ variant: "destructive" })}>Eliminar</button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
};

export default PublicationPage;
