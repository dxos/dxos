//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Button, Select, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { OfferStack } from '#components';
import { meta } from '#meta';
import { Booking, BookingOperation, BookingSearch as BS, Segment, TripCapabilities } from '#types';

import { offerToBookingProps, offerToFlightDetails } from './offer-to-segment';

export type BookingSearchProps = {
  segment: Segment.Segment;
};

export const BookingSearch = ({ segment }: BookingSearchProps) => {
  const { t } = useTranslation(meta.id);
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
  const [query, setQuery] = useState<BS.FlightSearchFields>({
    origin: origin?.code,
    destination: destination?.code,
    departureDate: Segment.getDepartAt(segment),
    cabinClass: 'economy',
    passengers: 1,
  });

  const [offers, setOffers] = useState<readonly BS.Offer[] | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Duffel rejects an offer request without a complete slice; require the core fields client-side
  // so the user gets actionable feedback rather than a server error.
  const canSearch = Boolean(service && query.origin && query.destination && query.departureDate);

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
          cabinClass: query.cabinClass,
          passengers: query.passengers,
        },
        provider: service.id,
      });
      if (invocationError) {
        const missingKey = invocationError.name === 'MissingApiKeyError';
        setError(missingKey ? t('booking.missing-key.message') : t('booking.error.message'));
        return;
      }
      setOffers(data?.offers);
    } catch (err) {
      const missingKey = err instanceof Error && err.name === 'MissingApiKeyError';
      setError(missingKey ? t('booking.missing-key.message') : t('booking.error.message'));
    } finally {
      setPending(false);
    }
  }, [service, query, invokePromise, t]);

  const handleSelectOffer = useCallback(
    (offer: BS.Offer) => {
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
    return <div className='p-form-gap text-description'>{t('booking.no-providers.message')}</div>;
  }

  const flightOffers = offers?.filter((offer): offer is BS.FlightOffer => offer._tag === 'flight');

  return (
    <div className='flex flex-col dx-container'>
      {/* Pinned query form: provider picker + schema-driven flight query + search action. */}
      <div className='flex flex-col gap-form-gap p-form-gap border-b border-separator'>
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

        <Form.Root schema={BS.FlightSearchFields} values={query} onValuesChanged={(values) => setQuery(values)}>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Root>

        <Button variant='primary' disabled={pending || !canSearch} onClick={() => void handleSearch()}>
          {pending ? t('booking.searching.label') : t('booking.search.label')}
        </Button>

        {error && <div className='text-error'>{error}</div>}
      </div>

      {/* Offers list: reuses the mosaic stack (own ScrollArea) so offers share the segment list affordances. */}
      {flightOffers && flightOffers.length === 0 ? (
        <div className='p-form-gap text-description'>{t('booking.no-offers.message')}</div>
      ) : (
        flightOffers && <OfferStack offers={flightOffers} onSelect={handleSelectOffer} />
      )}
    </div>
  );
};
