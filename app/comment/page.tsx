'use client'
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableRow, TableCell, TableHead, TableBody } from "@/components/ui/table";
import Link from "next/link";
import { Comment } from "@/interfaces/comment.interface";

const CommentPage = () => {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // Fetch comments from API
    // setComments(fetchedComments);
  }, []);

  const handleEdit = (id: string) => {
    // Implement edit logic
  };

  const handleDelete = (id: string) => {
    // Implement delete logic
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 p-24">
      <h1 className="text-2xl font-bold">Comentarios</h1>
      <Link href="/comment/create" className={buttonVariants({ variant: "default" })}>Crear Comentario</Link>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Contenido</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {comments.map(comment => (
            <TableRow key={comment.id}>
              <TableCell>{comment.id}</TableCell>
              <TableCell>{comment.content}</TableCell>
              <TableCell>
                <button onClick={() => handleEdit(comment.id)} className={buttonVariants({ variant: "default" })}>Editar</button>
                <button onClick={() => handleDelete(comment.id)} className={buttonVariants({ variant: "destructive" })}>Eliminar</button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
};

export default CommentPage;
