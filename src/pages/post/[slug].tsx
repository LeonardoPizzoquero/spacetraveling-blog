import next, { GetStaticPaths, GetStaticProps } from 'next';

import Prismic from '@prismicio/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import { Comments } from '../../components/Comments';
import { PreviewButton } from '../../components/PreviewButon';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  nextPost: {
    title: string;
    uid: string;
  };
  previousPost: {
    title: string;
    uid: string;
  };
}

export default function Post({
  post,
  preview,
  previousPost,
  nextPost,
}: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  if (isFallback || !post) {
    return <p>Carregando...</p>;
  }

  const estimatedTime = Math.ceil(
    RichText.asText(
      post.data.content.reduce((acc, data) => [...acc, ...data.body], [])
    ).split(' ').length / 200
  );

  return (
    <>
      <Head>
        <title>
          {isFallback ? 'Carregando...' : post.data.title} | spacetraveling
        </title>
      </Head>

      <Header />
      <main>
        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt={post.data.title}
        />
        <article
          className={`${styles.articleContainer} ${commonStyles.container}`}
        >
          <header>
            <h1>{post.data.title}</h1>
            <div className={commonStyles.postInformation}>
              <time>
                <FiCalendar />
                {format(parseISO(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </time>
              <span>
                <FiUser /> {post.data.author}
              </span>
              <span>
                <FiClock /> {estimatedTime} min
              </span>
            </div>

            <time>
              {format(
                parseISO(post.last_publication_date),
                "'*' 'editado em' dd MMM yyy',' 'às' HH:MM",
                {
                  locale: ptBR,
                }
              )}
            </time>
          </header>

          {post.data.content.map(({ body, heading }, key) => {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`${post.uid}.${key}`} className={styles.postContent}>
                {heading && <h2>{heading}</h2>}
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(body),
                  }}
                />
              </div>
            );
          })}

          <footer>
            {previousPost || nextPost ? (
              <div className={styles.goToPosts}>
                {previousPost && (
                  <Link href={`/post/${previousPost.uid}`}>
                    <a className="previousPost">
                      <h2>{previousPost.title}</h2>
                      <strong>Post anterior</strong>
                    </a>
                  </Link>
                )}

                {nextPost && (
                  <Link href={`/post/${nextPost.uid}`}>
                    <a className="nextPost">
                      <h2>{nextPost.title}</h2>
                      <strong>Próximo post</strong>
                    </a>
                  </Link>
                )}
              </div>
            ) : null}

            <Comments />

            <PreviewButton preview={preview} />
          </footer>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
    }
  );

  const paths = posts.results.map(post => ({ params: { slug: post.uid } }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  preview = false,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {});

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const previousPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: slug,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      after: slug,
      orderings: '[document.first_publication_date]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      preview,
      post,
      previousPost:
        previousPost.results[0].uid !== slug
          ? {
              title: previousPost.results[0].data.title,
              uid: previousPost.results[0].uid,
            }
          : null,
      nextPost:
        nextPost.results[0].uid !== slug
          ? {
              title: nextPost.results[0].data.title,
              uid: nextPost.results[0].uid,
            }
          : null,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
