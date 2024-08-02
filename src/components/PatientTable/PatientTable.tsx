import { ActionIcon, Center, Group, Loader, Menu, Table, Text, UnstyledButton } from '@mantine/core';
import {
  Filter,
  SearchRequest,
  deepEquals,
  formatSearchQuery,
  getReferenceString,
  isDataTypeLoaded,
} from '@medplum/core';
import {
  Bundle,
  Encounter,
  Location,
  OperationOutcome,
  Patient,
  Reference,
  Resource,
  ResourceType,
  SearchParameter,
} from '@medplum/fhirtypes';
import {
  Container,
  SearchControlField,
  buildFieldNameString,
  getFieldDefinitions,
  renderValue,
  useMedplum,
  useResource,
} from '@medplum/react';
import { IconRefresh } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classes from './PatientTable.module.css';

export interface PatientTableProps {
  readonly search: SearchRequest;
}

interface SearchControlState {
  readonly searchResponse?: Bundle;
  readonly selected: { [id: string]: boolean };
  readonly fieldEditorVisible: boolean;
  readonly filterEditorVisible: boolean;
  readonly filterDialogVisible: boolean;
  readonly exportDialogVisible: boolean;
  readonly filterDialogFilter?: Filter;
  readonly filterDialogSearchParam?: SearchParameter;
}

type PatientWithLocation = Patient & {
  location?: Reference<Location>;
};

interface LocationNameDisplayProps {
  location?: Reference<Location>;
}

function LocationNameDisplay(props: LocationNameDisplayProps): string | undefined {
  const location = useResource(props?.location);
  return location?.name;
}

function customRenderValue(
  resource: Resource | PatientWithLocation,
  field: SearchControlField
): string | JSX.Element | null | undefined {
  if (resource.resourceType === 'Patient' && field.name === 'location') {
    return <LocationNameDisplay location={(resource as PatientWithLocation).location} />;
  }
  return renderValue(resource, field);
}

export function PatientTable(props: PatientTableProps): JSX.Element {
  const medplum = useMedplum();
  const [loadingSchema, setLoadingSchema] = useState<string>();
  const [outcome, setOutcome] = useState<OperationOutcome | undefined>();
  const { search } = props;

  const [memoizedSearch, setMemoizedSearch] = useState(search);

  // We know that eventually search should stabilize to deepEquals the memoized one
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!deepEquals(search, memoizedSearch)) {
      setMemoizedSearch(search);
    }
  });

  const [state, setState] = useState<SearchControlState>({
    selected: {},
    fieldEditorVisible: false,
    filterEditorVisible: false,
    exportDialogVisible: false,
    filterDialogVisible: false,
  });

  const stateRef = useRef<SearchControlState>(state);
  stateRef.current = state;

  const total = search.total ?? 'accurate';

  const loadResults = useCallback(
    (options?: RequestInit) => {
      setOutcome(undefined);

      medplum
        .search(
          memoizedSearch.resourceType as ResourceType,
          formatSearchQuery({ ...memoizedSearch, total, fields: undefined }),
          options
        )
        .then((response) => {
          setState({ ...stateRef.current, searchResponse: response });
        })
        .catch((reason) => {
          setState({ ...stateRef.current, searchResponse: undefined });
          setOutcome(reason);
        });
    },
    [medplum, memoizedSearch, total]
  );

  const refreshResults = useCallback(() => {
    setState({ ...stateRef.current, searchResponse: undefined });
    loadResults({ cache: 'reload' });
  }, [loadResults]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  useEffect(() => {
    setLoadingSchema(props.search.resourceType);
    medplum
      .requestSchema(props.search.resourceType as ResourceType)
      .catch(console.error)
      .finally(() => setLoadingSchema(undefined));
  }, [medplum, props.search.resourceType]);

  const resources = useMemo<PatientWithLocation[]>(() => {
    const lastResult = state.searchResponse;
    const entries = lastResult?.entry;

    const patients = [] as Patient[];
    const encounters = new Map<string, Encounter>();
    for (const entry of entries ?? []) {
      const resource = entry?.resource;
      if (resource?.resourceType === 'Patient') {
        patients.push(resource);
      }
      if (resource?.resourceType === 'Encounter') {
        encounters.set(resource.subject?.reference as string, resource);
      }
    }
    return patients.map((patient) => {
      const patientRefStr = getReferenceString(patient);
      if (encounters.has(patientRefStr)) {
        return {
          ...patient,
          location: (encounters.get(patientRefStr) as Encounter).location?.[0].location as Reference<Location>,
        };
      } else {
        return { ...patient };
      }
    }) as PatientWithLocation[];
  }, [state.searchResponse]);

  if (!(isDataTypeLoaded(props.search.resourceType) && loadingSchema !== props.search.resourceType)) {
    return (
      <Center style={{ width: '100%', height: '100%' }}>
        <Loader />
      </Center>
    );
  }

  const fields = getFieldDefinitions(search);

  return (
    <div className={classes.root} data-testid="search-control">
      <Group mx={20} justify="flex-end">
        <ActionIcon variant="outline" color="blue" title="Refresh" onClick={refreshResults}>
          <IconRefresh size={15} />
        </ActionIcon>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            {fields.map((field) => (
              <Table.Th key={field.name}>
                <Menu shadow="md" width={240} position="bottom-end">
                  <Menu.Target>
                    <UnstyledButton className={classes.control} p={2}>
                      <Group justify="space-between" wrap="nowrap">
                        <Text fw={500}>{buildFieldNameString(field.name)}</Text>
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>
                </Menu>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {resources?.map(
            (resource) =>
              resource && (
                <Table.Tr key={resource.id} className={classes.tr} data-testid="search-control-row">
                  {fields.map((field) => (
                    <Table.Td key={field.name}>{customRenderValue(resource, field)}</Table.Td>
                  ))}
                </Table.Tr>
              )
          )}
        </Table.Tbody>
      </Table>
      {resources?.length === 0 && (
        <Container>
          <Center style={{ height: 150 }}>
            <Text size="xl" c="dimmed">
              No results
            </Text>
          </Center>
        </Container>
      )}
      {outcome && (
        <div data-testid="search-error">
          <pre style={{ textAlign: 'left' }}>{JSON.stringify(outcome, undefined, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export const MemoizedSearchControl = memo(PatientTable);
