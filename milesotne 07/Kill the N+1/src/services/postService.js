import prisma from '../../lib/prisma.js';

export async function getAllPostsWithAuthors() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt,
    author: post.author,
  }));
}
