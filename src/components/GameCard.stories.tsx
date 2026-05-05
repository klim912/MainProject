import type { Meta, StoryObj } from '@storybook/react';
import GameCard from './GameCard';

const meta: Meta<typeof GameCard> = {
  title: 'Components/GameCard',
  component: GameCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    game: {
      description: 'Game object with details',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    game: {
      dealID: '1',
      title: 'Sample Game',
      thumb: 'https://example.com/thumb.jpg',
      salePrice: '19.99',
    },
  },
};

export const ExpensiveGame: Story = {
  args: {
    game: {
      dealID: '2',
      title: 'Expensive Game',
      thumb: 'https://example.com/thumb2.jpg',
      salePrice: '59.99',
    },
  },
};