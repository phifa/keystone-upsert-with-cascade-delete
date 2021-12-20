import { KeystoneContext } from '@keystone-6/core/types';
import { uniqBy } from 'lodash';

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export async function promiseHandler(prom: Promise<any>) {
  return prom.then((data) => [null, data]).catch((err) => [err]);
}

interface RelSchema {
  field: string;
  schema: string;
  children?: {
    field: string;
    schema: string;
    children?: {
      field: string;
      schema: string;
    }[];
  }[];
}

async function deleteRelationships(
  context: KeystoneContext,
  model: string,
  identifier: string,
  identifierValues: string | number[],
  relationships?: RelSchema[],
  isTopLevel = true
) {
  const query = relationships?.length
    ? 'id ' + relationships?.map((item) => item.field + ' { id }').join(' ')
    : 'id';

  // Get intersections, possibly with relations
  const foundIntersectionIdsWithRelations = await context.query[model].findMany(
    {
      where: { [identifier]: { in: identifierValues } },
      query,
    }
  );

  // no intersections found, new items can just be created
  if (!foundIntersectionIdsWithRelations.length) return;

  // Remove relationships if available, otherwise go right to delete
  if (relationships?.length) {
    for (const foundIntersectionRelation of foundIntersectionIdsWithRelations) {
      for (const relation of relationships) {
        // get relation ids
        let childrenIdsToDelete: string | number[] = [];

        // safety check if relation.field is null, move to next field
        if (!foundIntersectionRelation[relation.field]) continue;

        // { many : true }
        if (Array.isArray(foundIntersectionRelation[relation.field])) {
          const justIds = foundIntersectionRelation[relation.field].map(
            ({ id }: { id: string }) => id
          );
          childrenIdsToDelete = [...childrenIdsToDelete, ...justIds];
          // { many : false }
        } else {
          if (foundIntersectionRelation[relation.field].id) {
            childrenIdsToDelete.push(
              foundIntersectionRelation[relation.field].id
            );
          }
        }

        if (childrenIdsToDelete.length) {
          const subRelations = relationships
            .filter((item) => item.field === relation.field)
            .map((r) => r.children)
            .flat()
            .filter(isNotUndefined);

          // recursive call as long as n children are done
          await deleteRelationships(
            context,
            relation.schema,
            'id',
            childrenIdsToDelete,
            subRelations,
            false
          );
        }
        // go to next relation
      }

      // go to next foundIntersectionRelation
    }
  }

  // Only remove relationships, not the object itself
  if (!isTopLevel) {
    // Remove model intersections
    const idsToDelete = uniqBy(
      foundIntersectionIdsWithRelations.map((item) => ({
        id: item.id,
      })),
      'id'
    );

    try {
      await context.db[model].deleteMany({
        // make sure, ids are unique, so no deletions of already deleted objects can be done
        where: idsToDelete,
      });
    } catch (err) {
      console.error(
        'Error while executing deleteMany with ids',
        idsToDelete,
        err
      );
    }
  }
}

export async function genericUpsert(
  upsertArgs: { where: any; data: any }[],
  context: KeystoneContext,
  model: string,
  identifier: string,
  relationships?: RelSchema[]
): Promise<any[] | undefined> {
  // [1,2,3] or ["UniqueValue", "AnotherUniqueVal"]
  const parentIds = upsertArgs.map((t: any) => t.where[identifier]);

  // Remove relationships but not the objects themselves
  await deleteRelationships(
    context,
    model,
    identifier,
    parentIds,
    relationships
  );

  // Get existing items, retrieve ids by identifier
  const idsToUpdate = (
    await context.db[model].findMany({
      where: { [identifier]: { in: parentIds } },
    })
  ).map((item) => item[identifier]);

  // Get an array of items that are already present in the database - the relationships will be created
  const updateArgs = upsertArgs.filter(
    (a) => idsToUpdate.indexOf(a.where[identifier]) !== -1
  );
  // Get an array of items that are not yet present in the database - the relationships will be created
  const createArgs = upsertArgs
    .filter((a) => idsToUpdate.indexOf(a.where[identifier]) === -1)
    .map((a) => a.data);

  let res = [];
  // recursive func to remove relationships
  try {
    const updated = await context.db[model].updateMany({ data: updateArgs });
    res.push(...updated);
  } catch (err) {
    console.error(
      `💩 Error in genericUpsert - updateMany for model: ${model} with ${identifier} failed`,
      updateArgs,
      err
    );
    throw err;
  }
  // create new entries
  try {
    const created = await context.db[model].createMany({
      data: createArgs,
    });
    res.push(...created);
  } catch (err) {
    console.error(
      `💩 Error in genericUpsert - createMany for model: ${model} with ${identifier} failed`,
      createArgs,
      err
    );
    throw err;
  }
  return res;
}
