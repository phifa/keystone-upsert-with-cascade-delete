import { KeystoneContext } from '@keystone-6/core/types';

function sampleData(amount: number) {
  function generate(name: string | number) {
    return {
      where: {
        name,
      },
      data: {
        name,
        cars: {
          create: {
            name: 'some car',
          },
        },
        kids: {
          create: {
            name: 'Dad',
            kiddos: {
              create: {
                name: 'Son',
                baby: {
                  create: {
                    name: 'Grandson',
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  let obj: Record<string, any> | undefined = {
    upsertArgs: [] as any[],
  };

  for (let i = 0; i < amount; i++) {
    obj.upsertArgs.push(generate(`Grandpa-${i}`));
  }

  return obj;
}

const gql = String.raw;

async function upsert(
  context: KeystoneContext,
  query: string,
  variables: Record<string, any> | undefined
) {
  const data = await context.graphql.run({
    query,
    variables,
  });
  return data;
}

export async function main(context: KeystoneContext, amount: number) {
  return await upsert(
    context,
    gql`
      mutation upsertSamples($upsertArgs: [SampleUpdateArgs!]!) {
        upsertSamples(upsertArgs: $upsertArgs) {
          name
          cars {
            name
          }
          kids {
            name
            kiddos {
              name
              baby {
                name
              }
            }
          }
        }
      }
    `,
    sampleData(amount)
  );
}
