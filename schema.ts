// Like the `config` function we use in keystone.ts, we use functions
// for putting in our config so we get useful errors. With typescript,
// we get these even before code runs.
import { list } from "@keystone-next/keystone";

// We're using some common fields in the starter. Check out https://keystonejs.com/docs/apis/fields#fields-api
// for the full list of fields.
import { text, relationship, password } from "@keystone-next/keystone/fields";

// We have a users list, a blogs list, and tags for blog posts, so they can be filtered.
// Each property on the exported object will become the name of a list (a.k.a. the `listKey`),
// with the value being the definition of the list, including the fields.
export const lists = {
  Sample: list({
    fields: {
      name: text({ isIndexed: "unique" }),
      kids: relationship({ ref: "SampleChild", many: true }),
      cars: relationship({ ref: "SampleCar", many: true }),
    },
  }),
  SampleCar: list({
    fields: {
      name: text(),
    },
  }),
  SampleChild: list({
    fields: {
      name: text(),
      kiddos: relationship({ ref: "SampleGrandChild", many: true }),
    },
  }),
  SampleGrandChild: list({
    fields: {
      name: text(),
      baby: relationship({ ref: "SampleGreatGrandChild", many: false }),
    },
  }),
  SampleGreatGrandChild: list({
    fields: {
      name: text(),
    },
  }),
  // Here we define the user list.
  User: list({
    // Here are the fields that `User` will have. We want an email and password so they can log in
    // a name so we can refer to them, and a way to connect users to posts.
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        validation: { isRequired: true },
        isIndexed: "unique",
        isFilterable: true,
      }),
      // The password field takes care of hiding details and hashing values
      password: password({ validation: { isRequired: true } }),
    },
    // Here we can configure the Admin UI. We want to show a user's name and posts in the Admin UI
    ui: {
      listView: {
        initialColumns: ["name"],
      },
    },
  }),
};
