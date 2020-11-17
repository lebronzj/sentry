import React from 'react';
import styled from '@emotion/styled';

import {addErrorMessage} from 'app/actionCreators/indicator';
import {Client} from 'app/api';
import Feature from 'app/components/acl/feature';
import SelectControl from 'app/components/forms/selectControl';
import List from 'app/components/list';
import ListItem from 'app/components/list/listItem';
import {Panel, PanelBody} from 'app/components/panels';
import {t, tct} from 'app/locale';
import space from 'app/styles/space';
import {Environment, Organization} from 'app/types';
import {getDisplayName} from 'app/utils/environment';
import theme from 'app/utils/theme';
import {
  convertDatasetEventTypesToSource,
  DATA_SOURCE_LABELS,
  DATA_SOURCE_TO_SET_AND_EVENT_TYPES,
} from 'app/views/alerts/utils';
import SearchBar from 'app/views/events/searchBar';
import FormField from 'app/views/settings/components/forms/formField';
import SelectField from 'app/views/settings/components/forms/selectField';

import {DEFAULT_AGGREGATE} from './constants';
import MetricField from './metricField';
import {Datasource, IncidentRule, TimeWindow} from './types';

const TIME_WINDOW_MAP: Record<TimeWindow, string> = {
  [TimeWindow.ONE_MINUTE]: t('1 minute'),
  [TimeWindow.FIVE_MINUTES]: t('5 minutes'),
  [TimeWindow.TEN_MINUTES]: t('10 minutes'),
  [TimeWindow.FIFTEEN_MINUTES]: t('15 minutes'),
  [TimeWindow.THIRTY_MINUTES]: t('30 minutes'),
  [TimeWindow.ONE_HOUR]: t('1 hour'),
  [TimeWindow.TWO_HOURS]: t('2 hours'),
  [TimeWindow.FOUR_HOURS]: t('4 hours'),
  [TimeWindow.ONE_DAY]: t('24 hours'),
};

type Props = {
  api: Client;
  organization: Organization;
  projectSlug: string;
  disabled: boolean;
  thresholdChart: React.ReactElement;
  onFilterSearch: (query: string) => void;
};

type State = {
  environments: Environment[] | null;
};

class RuleConditionsFormWithGuiFilters extends React.PureComponent<Props, State> {
  state: State = {
    environments: null,
  };

  componentDidMount() {
    this.fetchData();
  }

  async fetchData() {
    const {api, organization, projectSlug} = this.props;

    try {
      const environments = await api.requestPromise(
        `/projects/${organization.slug}/${projectSlug}/environments/`,
        {
          query: {
            visibility: 'visible',
          },
        }
      );
      this.setState({environments});
    } catch (_err) {
      addErrorMessage(t('Unable to fetch environments'));
    }
  }

  render() {
    const {organization, disabled, onFilterSearch} = this.props;
    const {environments} = this.state;

    const environmentList: [IncidentRule['environment'], React.ReactNode][] =
      environments?.map((env: Environment) => [env.name, getDisplayName(env)]) ?? [];

    const anyEnvironmentLabel = (
      <React.Fragment>
        {t('All Environments')}
        <div className="all-environment-note">
          {tct(
            `This will count events across every environment. For example,
             having 50 [code1:production] events and 50 [code2:development]
             events would trigger an alert with a critical threshold of 100.`,
            {code1: <code />, code2: <code />}
          )}
        </div>
      </React.Fragment>
    );
    environmentList.unshift([null, anyEnvironmentLabel]);

    const formElemBaseStyle = {
      padding: `${space(0.5)}`,
      border: 'none',
    };

    return (
      <Panel>
        <StyledPanelBody>
          <List symbol="colored-numeric">
            <StyledListItem>{t('Select the events you want to alert on')}</StyledListItem>
            <FormRow>
              <SelectField
                name="environment"
                placeholder={t('All Environments')}
                style={{
                  ...formElemBaseStyle,
                  minWidth: 250,
                  flex: 2,
                }}
                styles={{
                  singleValue: (base: any) => ({
                    ...base,
                    '.all-environment-note': {display: 'none'},
                  }),
                  option: (base: any, state: any) => ({
                    ...base,
                    '.all-environment-note': {
                      ...(!state.isSelected && !state.isFocused
                        ? {color: theme.gray400}
                        : {}),
                      fontSize: theme.fontSizeSmall,
                    },
                  }),
                }}
                choices={environmentList}
                isDisabled={disabled || this.state.environments === null}
                isClearable
                inline={false}
                flexibleControlStateSize
                inFieldLabel={t('Env: ')}
              />
              <Feature requireAll features={['organizations:performance-view']}>
                <FormField
                  name="datasource"
                  inline={false}
                  style={{
                    ...formElemBaseStyle,
                    minWidth: 250,
                    flex: 3,
                  }}
                  flexibleControlStateSize
                >
                  {({onChange, onBlur, model}) => {
                    const formDataset = model.getValue('dataset');
                    const formEventTypes = model.getValue('eventTypes');
                    const mappedValue = convertDatasetEventTypesToSource(
                      formDataset,
                      formEventTypes
                    );
                    return (
                      <SelectControl
                        value={mappedValue}
                        inFieldLabel={t('Data Source: ')}
                        onChange={optionObj => {
                          const optionValue = optionObj.value;
                          onChange(optionValue, {});
                          onBlur(optionValue, {});
                          // Reset the aggregate to the default (which works across
                          // datatypes), otherwise we may send snuba an invalid query
                          // (transaction aggregate on events datasource = bad).
                          model.setValue('aggregate', DEFAULT_AGGREGATE);

                          // set the value of the dataset and event type from data source
                          const {dataset, eventTypes} =
                            DATA_SOURCE_TO_SET_AND_EVENT_TYPES[optionValue] ?? {};
                          model.setValue('dataset', dataset);
                          model.setValue('eventTypes', eventTypes);
                        }}
                        options={[
                          {
                            label: t('Errors'),
                            options: [
                              {
                                value: Datasource.ERROR_DEFAULT,
                                label: DATA_SOURCE_LABELS[Datasource.ERROR_DEFAULT],
                              },
                              {
                                value: Datasource.DEFAULT,
                                label: DATA_SOURCE_LABELS[Datasource.DEFAULT],
                              },
                              {
                                value: Datasource.ERROR,
                                label: DATA_SOURCE_LABELS[Datasource.ERROR],
                              },
                            ],
                          },
                          {
                            label: t('Transactions'),
                            options: [
                              {
                                value: Datasource.TRANSACTION,
                                label: DATA_SOURCE_LABELS[Datasource.TRANSACTION],
                              },
                            ],
                          },
                        ]}
                        isDisabled={disabled}
                        required
                      />
                    );
                  }}
                </FormField>
              </Feature>
              <FormField
                name="query"
                inline={false}
                style={{
                  ...formElemBaseStyle,
                  flex: 6,
                  minWidth: 400,
                }}
                flexibleControlStateSize
              >
                {({onChange, onBlur, onKeyDown, initialData, model}) => (
                  <SearchContainer>
                    <StyledSearchBar
                      defaultQuery={initialData?.query ?? ''}
                      omitTags={['event.type']}
                      disabled={disabled}
                      useFormWrapper={false}
                      organization={organization}
                      placeholder={
                        model.getValue('dataset') === 'events'
                          ? t('Filter events by level, message, or other properties...')
                          : t('Filter transactions by URL, tags, and other properties...')
                      }
                      onChange={onChange}
                      onKeyDown={e => {
                        /**
                         * Do not allow enter key to submit the alerts form since it is unlikely
                         * users will be ready to create the rule as this sits above required fields.
                         */
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }

                        onKeyDown?.(e);
                      }}
                      onBlur={query => {
                        onFilterSearch(query);
                        onBlur(query);
                      }}
                      onSearch={query => {
                        onFilterSearch(query);
                        onChange(query, {});
                      }}
                    />
                  </SearchContainer>
                )}
              </FormField>
            </FormRow>
            <StyledListItem>{t('Choose a metric')}</StyledListItem>
            <FormRow>
              <MetricField
                name="aggregate"
                help={null}
                organization={organization}
                disabled={disabled}
                style={{
                  ...formElemBaseStyle,
                  flex: 6,
                  minWidth: 300,
                }}
                inline={false}
                flexibleControlStateSize
                required
              />
              <FormRowText>over</FormRowText>
              <SelectField
                name="timeWindow"
                style={{
                  ...formElemBaseStyle,
                  flex: 1,
                  minWidth: 150,
                }}
                choices={Object.entries(TIME_WINDOW_MAP)}
                required
                isDisabled={disabled}
                getValue={value => Number(value)}
                setValue={value => `${value}`}
                inline={false}
                flexibleControlStateSize
              />
            </FormRow>
            {this.props.thresholdChart}
          </List>
        </StyledPanelBody>
      </Panel>
    );
  }
}

const StyledPanelBody = styled(PanelBody)`
  h4 {
    margin-bottom: ${space(1)};
  }
`;

const SearchContainer = styled('div')`
  display: flex;
`;

const StyledSearchBar = styled(SearchBar)`
  flex-grow: 1;
`;

const StyledListItem = styled(ListItem)`
  font-size: ${p => p.theme.fontSizeExtraLarge};
  margin: ${space(3)} ${space(3)} 0 ${space(3)};
`;

const FormRow = styled('div')`
  display: flex;
  flex-direction: row;
  padding: ${space(1.5)} ${space(3)};
  align-items: flex-end;
  flex-wrap: wrap;
`;

const FormRowText = styled('div')`
  padding: ${space(0.5)};
  line-height: 38px;
`;

export default RuleConditionsFormWithGuiFilters;
