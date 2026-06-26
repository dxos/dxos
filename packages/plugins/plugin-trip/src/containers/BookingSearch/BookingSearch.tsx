//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { PluginRegistryButton } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Message, Select, Separator, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Empty } from '@dxos/react-ui-list';
import { trim } from '@dxos/util';

import { OfferStack } from '#components';
import { meta } from '#meta';
import { Booking, BookingOperation, BookingSearch as BookingSearchType, Segment, TripCapabilities } from '#types';

import { offerToBookingProps, offerToFlightDetails } from './offer-to-segment';

/** 2-column form layout for the flight query (parallels SegmentCard's FLIGHT_LAYOUT). */
const SEARCH_LAYOUT = trim`
  <grid cols="2">
    <field name="origin"/>
    <field name="destination"/>
    <field name="departureDate"/>
    <field name="returnDate"/>
    <field name="serviceClass"/>
    <field name="passengers"/>
    <field name="operator" span="2"/>
  </grid>
`;

/**
 * True when the (date-only component of the) ISO departure date falls before today (UTC, matching
 * the provider's date-only `departure_date`). Providers like Duffel reject past dates, so this drives
 * a client-side guard with an actionable message. Empty/undefined dates are not "past" (the
 * presence check in `canSearch` handles them).
 */
const isPastDate = (iso?: string): boolean => {
  if (!iso) {
    return false;
  }
  return iso.slice(0, 10) < new Date().toISOString().slice(0, 10);
};

export type BookingSearchProps = {
  segment: Segment.Segment;
};

export const BookingSearch = ({ segment }: BookingSearchProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const kind = Segment.getKind(segment);

  // Resolve contributed services for the provider picker + empty state. The actual search runs
  // through the SearchBookings operation so the assistant shares the same path.
  const allServices = useCapabilities(TripCapabilities.BookingService);
  const services = useMemo(() => allServices.filter((service) => service.kinds.includes(kind)), [allServices, kind]);
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const service = useMemo(
    () => services.find((candidate) => candidate.id === serviceId) ?? services.at(0),
    [services, serviceId],
  );

  const origin = Segment.getOrigin(segment);
  const destination = Segment.getDestination(segment);
  // Driven by the schema-based Form; fields mirror the SearchBookings flight query
  // (departureDate is an ISO string, as stored by Format.DateTime).
  const [query, setQuery] = useState<BookingSearchType.FlightSearchFields>({
    origin: origin?.code,
    destination: destination?.code,
    departureDate: Segment.getDepartAt(segment),
    serviceClass: 'economy',
    passengers: 1,
  });

  const [offers, setOffers] = useState<readonly BookingSearchType.Offer[] | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Duffel rejects an offer request without a complete slice; require the core fields client-side
  // so the user gets actionable feedback rather than a server error.
  const canSearch = Boolean(service && query.origin && query.destination && query.departureDate);

  // Field-level validation surfaced inline by the Form. A past departure date is the most common
  // provider rejection (e.g. Duffel's "departure_date must be in the future"), so catch it here and
  // block submit before hitting the provider.
  const handleValidate = useCallback(
    (values: BookingSearchType.FlightSearchFields) =>
      isPastDate(values.departureDate)
        ? [{ path: 'departureDate', message: t('booking.past-date.message') }]
        : undefined,
    [t],
  );

  // Map an operation/provider error onto a user-facing message: a missing key and a provider
  // rejection (e.g. Duffel's "departure_date must be in the future") are actionable, so prefer them
  // over the generic fallback.
  const messageForError = useCallback(
    (cause: { name?: string; message?: string }): string => {
      switch (cause.name) {
        case 'MissingApiKeyError':
          return t('booking.missing-key.message');
        case 'BookingProviderError':
          return cause.message || t('booking.error.message');
        default:
          return t('booking.error.message');
      }
    },
    [t],
  );

  const handleSearch = useCallback(async () => {
    if (!service) {
      return;
    }
    setPending(true);
    setError(undefined);
    setOffers(undefined);
    try {
      const { data, error: invocationError } = await invokePromise(BookingOperation.SearchBookings, {
        query: {
          _tag: 'flight',
          origin: query.origin || undefined,
          destination: query.destination || undefined,
          departureDate: query.departureDate || undefined,
          returnDate: query.returnDate || undefined,
          serviceClass: query.serviceClass,
          operator: query.operator || undefined,
          passengers: query.passengers,
        },
        provider: service.id,
      });
      if (invocationError) {
        setError(messageForError(invocationError));
        return;
      }
      setOffers(data?.offers);
    } catch (err) {
      setError(messageForError(err instanceof Error ? err : {}));
    } finally {
      setPending(false);
    }
  }, [service, query, invokePromise, messageForError]);

  const handleSelectOffer = useCallback(
    (offer: BookingSearchType.Offer) => {
      if (offer._tag !== 'flight') {
        return;
      }
      const space = getSpace(segment);
      if (!space) {
        return;
      }
      const booking = space.db.add(Booking.make(offerToBookingProps(offer)));
      const details = offerToFlightDetails(offer);
      Obj.update(segment, (segment) => {
        // Mutate the (flight) details in place: a whole-object assignment would require the
        // readonly schema-Type shape to match the live object's mutable instance-Type.
        if (segment.details._tag !== 'flight') {
          return;
        }

        Object.assign(segment.details, {
          provider: details.provider,
          number: details.number,
          origin: details.origin && { code: details.origin.code, name: details.origin.name },
          destination: details.destination && { code: details.destination.code, name: details.destination.name },
          departAt: details.departAt,
          arriveAt: details.arriveAt,
          serviceClass: details.serviceClass,
        });
        segment.booking = Ref.make(booking);
      });
    },
    [segment],
  );

  if (services.length === 0) {
    return (
      <div className='p-form-padding'>
        <Message.Root valence='info'>
          <Message.Title>{t('booking.no-providers.message')}</Message.Title>
          <Message.Content classNames='flex flex-col py-1 gap-2'>
            {/* `span` (not `p`): Message.Content already renders a `<p>`, and `<p>` cannot nest `<p>`. */}
            <span>{t('booking.enable-providers.message')}</span>
            <PluginRegistryButton />
          </Message.Content>
        </Message.Root>
      </div>
    );
  }

  const flightOffers = offers?.filter((offer): offer is BookingSearchType.FlightOffer => offer._tag === 'flight');

  return (
    <div className='flex flex-col dx-container'>
      {/* Query form: content-height (Viewport without `scroll`) — does not expand; offers fill the rest. */}
      <Form.Root
        schema={BookingSearchType.FlightSearchFields}
        values={query}
        onValidate={handleValidate}
        onValuesChanged={(values) => setQuery(values)}
        onSave={() => void handleSearch()}
      >
        <Form.Viewport>
          <Form.Content>
            {services.length > 1 && (
              <Select.Root value={service?.id} onValueChange={setServiceId}>
                <Select.TriggerButton placeholder={t('booking.provider.placeholder')} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {services.map((candidate) => (
                        <Select.Option key={candidate.id} value={candidate.id}>
                          {candidate.label}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            )}
            <Form.Layout template={SEARCH_LAYOUT} />
            <Form.Error>{error}</Form.Error>
            <Form.Submit
              icon='ph--magnifying-glass--regular'
              label={pending ? t('booking.searching.label') : t('booking.search.label')}
              disabled={pending || !canSearch}
            />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>

      {/* Offers list: reuses the mosaic stack (own ScrollArea) so offers share the segment list affordances. */}
      {flightOffers && (
        <>
          <Separator />
          {flightOffers.length === 0 ? (
            <Empty label={t('booking.no-offers.message')} />
          ) : (
            <OfferStack offers={flightOffers} onSelect={handleSelectOffer} />
          )}
        </>
      )}
    </div>
  );
};
