import {
  BaseKeystoneTypeInfo,
  GraphQLResolver,
  KeystoneContext,
} from '@keystone-6/core/types';
import { genericUpsert } from './genericUpsert';

export const upsertSamples: GraphQLResolver<
  KeystoneContext<BaseKeystoneTypeInfo>
> = async (root, { upsertArgs }, context, info) => {
  return await genericUpsert(upsertArgs, context, 'Sample', 'name', [
    {
      field: 'kids',
      schema: 'SampleChild',
      children: [
        {
          field: 'kiddos',
          schema: 'SampleGrandChild',
          children: [
            {
              field: 'baby',
              schema: 'SampleGreatGrandChild',
            },
          ],
        },
      ],
    },
    {
      field: 'cars',
      schema: 'SampleCar',
    },
  ]);
};
