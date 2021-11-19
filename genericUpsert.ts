import { KeystoneContext } from "@keystone-next/keystone/types";

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

const gql = String.raw;

function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

async function removeExisting(
  context: KeystoneContext,
  model: string,
  identifier: string,
  identifierValues: string | number[],
  relationships?: RelSchema[]
) {
  const query = relationships?.length
    ? "id " + relationships?.map((item) => item.field + " { id }").join(" ")
    : "id";

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
          await removeExisting(
            context,
            relation.schema,
            "id",
            childrenIdsToDelete,
            subRelations
          );
        }
        // go to next relation
      }

      // go to next foundIntersectionRelation
    }
  }

  // Remove model intersections
  await context.query[model].deleteMany({
    where: foundIntersectionIdsWithRelations.map((item) => ({ id: item.id })),
    query: gql`id`,
  });
}

export async function genericUpsert(
  upsertArgs: { where: any; data: any }[],
  context: KeystoneContext,
  model: string,
  identifier: string,
  relationships?: RelSchema[]
): Promise<any[] | undefined> {
  try {
    // [1,2,3] or ["UniqueValue", "AnotherUniqueVal"]
    const parentIds = upsertArgs.map((t: any) => t.where[identifier]);
    // recursive func to remove relationships
    await removeExisting(context, model, identifier, parentIds, relationships);
    // create new entries
    return await context.db[model].createMany({
      data: upsertArgs.map((u: any) => u.data),
    });
  } catch (err) {
    console.log("💩 generic upsert failed", err);
  }
}
